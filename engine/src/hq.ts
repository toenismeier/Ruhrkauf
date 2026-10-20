// Hauptverwaltung (HQ): Bürogebäude, Etagen, Abteilungen, Angebote, Kosten und Wirkungen auf die Engine.
// Die Zentrale ist kein Pauschalposten mehr: Kosten = Personal + Sachkosten je FTE + Büromiete + Nebenkosten
// (+ Strafen, wenn die Verwaltung unter der Mindeststufe arbeitet). Restmieten gekündigter Büros laufen als
// Sondereffekt wie bei den Häusern.
import type { Cluster, GameState, Haus, Region } from './types';
import { STAEDTE } from './daten';
import { abstand100, BALLUNGSRAUM, KNOTEN } from './standorte';
import { clamp, eur, ganzZwischen, melde, mio, waehle, zwischen, type RngHalter } from './util';
import { vorstandFuerGrafik, vorstandKostenWoche, vorstandWirkung } from './vorstand';
import { produktKostenWoche } from './produkte';
// O01 Organisation: Differenz der Leitungsgehälter, Start = 0.
import { organisationLeitungKostenWoche } from './organisation';

// ---------------------------------------------------------------------------------------------
// Datenmodell (Vertrag)
// ---------------------------------------------------------------------------------------------

export type AbteilungId = 'controlling' | 'einkauf' | 'marketing' | 'personal' | 'immobilien'
  | 'logistik' | 'ecommerce' | 'recht' | 'vm' | 'verwaltung' | 'produkt';

export type HqTyp = 'altbau' | 'nachkrieg' | 'buero70' | 'glas' | 'loft' | 'campus';
export type Stufe = 0 | 1 | 2 | 3;

export interface HqEtage { nr: number; qm: number; gemietet: boolean; abteilungen: AbteilungId[]; archiv?: boolean }

export interface HqGebaeude {
  id: string; name: string; stadt: string;
  typ: HqTyp;
  etagen: HqEtage[]; mieteQmMonat: number; bisWoche: number; seitWoche: number;
  /** Zusatz: Nebenkosten in €/qm im Monat (Altbauten und 60er-Bauten teurer). */
  nebenkostenQmMonat: number;
  /** Zusatz: Vermieter (fiktiv). */
  vermieter: string;
}

export interface Abteilung {
  id: AbteilungId; stufe: Stufe; fte: number; gebaeudeId?: string; etage?: number; umzugBis?: number;
  /** Zusatz: belegte qm je Etage im Gebäude gebaeudeId (eine Abteilung kann über mehrere Etagen reichen; etage = erste Etage). */
  belegung?: { etage: number; qm: number }[];
  /** Zusatz: neu eingestellte FTE wirken bis zu dieser Woche nur zur Hälfte. */
  einarbeitungBis?: number;
  neuFte?: number;
}

export interface HqAngebot {
  id: string; gebaeude: HqGebaeude; frist: number;
  /** Zusatz: Laufzeit des Mietvertrags bei Anmietung. */
  laufzeitJahre: number;
}

export interface HqRestmiete { text: string; mieteWoche: number; bis: number }

export interface Hq {
  gebaeude: HqGebaeude[]; abteilungen: Abteilung[]; angebote: HqAngebot[]; sitz: string;
  // Zusätze für Kalibrierung und Ablauf
  /** Eigener Zufallsstrom, damit die HQ-Angebote die übrige Simulation nicht verschieben. */
  rng: number;
  /** Soll-FTE je Abteilung bei Stufe 1 und Startgröße der Kette. */
  normFte: Record<AbteilungId, number>;
  /** Sachkosten je FTE und Woche (IT-Arbeitsplatz, Reisen, Dienstleister), kalibriert auf den Start. */
  sachJeFte: number;
  /** Gewichtete Hauszahl beim Start (Basis für den Größenfaktor). */
  hausBasis: number;
  /** Wirksame Stufe je Abteilung (0..3, stetig), wird wöchentlich und nach jeder Aktion berechnet. */
  wirkung: Record<AbteilungId, number>;
  /** Besetzungsstand je Abteilung (0..3): Abbau wirkt verzögert, die Organisation zehrt erst von ihrer Substanz. */
  stand: Record<AbteilungId, number>;
  /** Reiseindex des Startsitzes (Bezug für den Standortfaktor). */
  reiseBasis: number;
  restmieten: HqRestmiete[];
  zaehler: number;
}

// ---------------------------------------------------------------------------------------------
// Parameter
// ---------------------------------------------------------------------------------------------

/** Archiv ist freiwillig und hat keine Personal- oder Wirkungswerte. */
export const ARCHIV_QM = 90;
export const ARCHIV_AKTIV = true; // Übergang bis N13 Einstellungen verfügbar ist.

export const ABTEILUNGEN: AbteilungId[] = ['controlling', 'einkauf', 'marketing', 'personal', 'immobilien', 'logistik', 'ecommerce', 'recht', 'vm', 'verwaltung', 'produkt'];

export const ABTEILUNG_NAME: Record<AbteilungId, string> = {
  controlling: 'Controlling', einkauf: 'Einkauf', marketing: 'Marketing', personal: 'Personal', immobilien: 'Immobilien',
  logistik: 'Logistik', ecommerce: 'E-Commerce', recht: 'Recht', vm: 'Visual Merchandising', verwaltung: 'Verwaltung', produkt: 'Produktentwicklung',
};

export const HQ_PARAM = {
  qmJeFte: 14,
  /** Soll-FTE je Stufe relativ zu Stufe 1. */
  stufenFaktor: [0.5, 1, 1.25, 1.5] as const,
  /** Personalkosten je FTE und Woche inkl. Nebenkosten. */
  lohn: {
    controlling: 1_500, einkauf: 1_450, marketing: 1_400, personal: 1_300, immobilien: 1_550,
    logistik: 1_300, ecommerce: 1_450, recht: 1_700, vm: 1_150, verwaltung: 1_100, produkt: 1_400,
  } as Record<AbteilungId, number>,
  /** Rohwerte Soll-FTE bei Stufe 1 (werden auf die Startkosten skaliert) und Überbesetzung zum Start. */
  normRoh: {
    // Produktentwicklung (Designer, Technik, Musterung) ist aus dem Einkauf herausgelöst: 145 + 25 = bisher 170
    controlling: 75, einkauf: 145, marketing: 115, personal: 100, immobilien: 45,
    logistik: 100, ecommerce: 95, recht: 35, vm: 110, verwaltung: 150, produkt: 25,
  } as Record<AbteilungId, number>,
  ueberbesetzungStart: {
    controlling: 1.0, einkauf: 1.05, marketing: 1.25, personal: 1.3, immobilien: 1.0,
    logistik: 1.05, ecommerce: 1.0, recht: 1.0, vm: 1.6, verwaltung: 1.6, produkt: 1.05,
  } as Record<AbteilungId, number>,
  sachJeFteRichtwert: 520,
  abfindungRegulaer: 45_000,
  abfindungInsolvenz: 12_000,
  einarbeitungJeFte: 9_000,
  einarbeitungWochen: 8,
  umzugJeFteGebaeude: 2_500,
  umzugJeFteEtage: 1_000,
  umzugWochen: 4,
  /** Wirkungsverlust je zusätzlicher Stadt mit Abteilungen. */
  verteilungJeStadt: 0.04,
  verteilungMin: 0.84,
  /** Strafen der Verwaltung unter Stufe 1: Anteil der Startkosten je Woche bei Stufe 0. */
  verwaltungStrafe: 0.08,
  /** Kleine Unterbesetzung (3 %) fängt die Abteilung ohne Wirkungsverlust auf. */
  toleranz: 0.97,
  startLeerquote: 0.25,
  /** Abbau der Besetzung schlägt mit 5 % je Woche auf die Wirkung durch (Halbwertszeit rund 14 Wochen). */
  traegheit: 0.05,
  /** Reisekosten je FTE und Woche je Punkt Reiseindex (Fahrten in die Häuser, Dienstwagen, Hotels). */
  reiseJeFte: 45,
  /** Wirkungsverlust je Punkt Reiseindex über dem Startsitz. */
  reiseWirkung: 0.06,
};

/** Standortfaktoren je Stadtgröße: Lohnniveau, Recruiting, Fachkräfte. */
export const HQ_STANDORT: Record<Cluster, { lohn: number; recruiting: number; wirkung: number; marketingEcommerce: number }> = {
  metropole: { lohn: 1.04, recruiting: 0.75, wirkung: 1, marketingEcommerce: 1.12 },
  grossstadt: { lohn: 1, recruiting: 1, wirkung: 1, marketingEcommerce: 1 },
  mittelstadt: { lohn: 0.95, recruiting: 1.3, wirkung: 0.95, marketingEcommerce: 0.95 },
};



interface TypParam { etagen: [number, number]; qm: [number, number]; preis: number; nk: number; ausbau: number; name: string }
export const HQ_TYPEN: Record<HqTyp, TypParam> = {
  altbau: { etagen: [3, 5], qm: [600, 900], preis: 1.0, nk: 4.2, ausbau: 80, name: 'Kontorhaus' },
  nachkrieg: { etagen: [8, 14], qm: [900, 1400], preis: 0.82, nk: 4.6, ausbau: 70, name: 'Verwaltungsbau' },
  buero70: { etagen: [5, 9], qm: [1000, 1800], preis: 0.85, nk: 4.0, ausbau: 60, name: 'Bürozentrum' },
  glas: { etagen: [8, 20], qm: [700, 1200], preis: 1.18, nk: 3.5, ausbau: 35, name: 'Glashaus' },
  loft: { etagen: [2, 4], qm: [1000, 2000], preis: 1.05, nk: 3.3, ausbau: 55, name: 'Lofthaus' },
  campus: { etagen: [3, 5], qm: [1500, 2500], preis: 0.95, nk: 3.0, ausbau: 30, name: 'Bürocampus' },
};

const LAGEN = ['am Ring', 'am Stadtpark', 'Mühlenstraße', 'am Hafen', 'Lindenhof', 'Nordtor', 'am Wall', 'Bahnhofsplatz', 'Brückenstraße', 'am Kanal', 'Weberstraße', 'Gartenfeld', 'am Schlachthof', 'Kornmarkt'];
const VERMIETER_HQ = ['Rheinruhr Büroimmobilien GmbH', 'Hanseatische Objektgesellschaft mbH', 'Lindwurm Office Real Estate GmbH', 'Kontorwerk Invest GmbH', 'Mittelland Gewerbebau AG', 'Sternberg Projektentwicklung KG'];

/** Wirkungskurven: Werte bei wirksamer Stufe 0, 2 und 3 (Stufe 1 = 0, also die bisherige Kalibrierung). */
export const HQ_WIRKUNG = {
  einkaufKonditionen: [-0.006, 0.005, 0.009], // Anteil am Wareneinsatz, als Konditionen zur WKZ-Zeile
  einkaufWkz: [-0.3, 0.15, 0.25], // Faktor auf WKZ
  marketing: [-0.5, 0.15, 0.25], // Faktor auf die Wirkung des Marketingbudgets
  personalBesetzung: [0.04, -0.012, -0.02], // Verschiebung der Besetzungsnorm (0,92)
  personalBetriebsrat: [-8, 3, 5], // Zielwert Betriebsrat
  personalMoral: [-8, 4, 6], // Zielmoral Filialleitungen
  immobilienVerhandlung: [-0.15, 0.1, 0.15], // Erfolgswahrscheinlichkeit Mietverhandlung
  immobilienAnfragen: [-0.4, 0.25, 0.4], // Häufigkeit Untermietanfragen
  immobilienMiete: [-0.08, 0.05, 0.08], // Miethöhe Untermietangebote
  immobilienBuero: [0.08, -0.04, -0.07], // Preis neuer Büroangebote
  immobilienMietende: [0.05, -0.04, -0.06], // Marktmiete bei auslaufenden Hausmietverträgen
  logistik: [0.1, -0.03, -0.05], // Faktor auf Logistikkosten
  ecommerce: [-0.008, 0.005, 0.008], // Umsatzbonus
  recht: [0.15, -0.07, -0.1], // Faktor auf Sozialplan, Abfindungen, Restmieten
  vm: [-0.012, 0.004, 0.006], // Flächenproduktivität
} as const;

type Kurve = readonly [number, number, number];

export function kurve(L: number, k: Kurve): number {
  if (L <= 1) return k[0] * (1 - Math.max(0, L));
  if (L <= 2) return k[1] * (L - 1);
  return k[1] + (k[2] - k[1]) * (Math.min(3, L) - 2);
}

// ---------------------------------------------------------------------------------------------
// Grundfunktionen
// ---------------------------------------------------------------------------------------------

const wochenMiete = (qm: number, qmMonat: number): number => (qm * qmMonat * 12) / 52;

function hausGewicht(h: Haus): number {
  const aktiv = h.status === 'offen' || h.status === 'schliessung_verhandlung' || h.status === 'raeumung';
  return aktiv ? (h.format === 'warenhaus' ? 1 : 0.3) : 0;
}

/** Größenfaktor: eine kleinere Kette braucht eine kleinere Zentrale (Fixanteil 45 %). */
export function groessenFaktor(s: GameState): number {
  // Häuser in Schließung zählen nicht mehr: die Zentrale plant für die künftige Kette
  const jetzt = s.haeuser.reduce((a, h) => a + (h.status === 'offen' ? hausGewicht(h) : 0), 0);
  return 0.45 + 0.55 * clamp(jetzt / Math.max(1, s.hq.hausBasis), 0, 1);
}

export function sollFte(s: GameState, id: AbteilungId, stufe: Stufe): number {
  return s.hq.normFte[id] * HQ_PARAM.stufenFaktor[stufe] * groessenFaktor(s);
}

export const qmBedarf = (a: Abteilung): number => a.fte * HQ_PARAM.qmJeFte;
const qmAufEtage = (a: Abteilung, nr: number): number => (a.belegung ?? []).filter((b) => b.etage === nr).reduce((x, b) => x + b.qm, 0);

export function abteilung(s: GameState, id: AbteilungId): Abteilung {
  const a = s.hq.abteilungen.find((x) => x.id === id);
  if (!a) throw new Error(`Abteilung ${id} fehlt.`);
  return a;
}

function gebaeude(s: GameState, id: string | undefined): HqGebaeude | undefined {
  return id === undefined ? undefined : s.hq.gebaeude.find((g) => g.id === id);
}

function stadtDaten(stadt: string): { region: Region; cluster: Cluster } {
  const d = STAEDTE.find((x) => x[0] === stadt);
  return d ? { region: d[1], cluster: d[2] } : { region: 'West', cluster: 'grossstadt' };
}

/** Reiseindex: mittlere Entfernung zu den offenen Häusern in 100 km, an Verkehrsknoten 20 % kürzer. */
export function reiseIndex(s: GameState, stadt: string): number {
  let summe = 0;
  let gewicht = 0;
  for (const h of s.haeuser) {
    const gw = hausGewicht(h);
    if (gw <= 0) continue;
    summe += gw * abstand100(stadt, h.stadt);
    gewicht += gw;
  }
  return (gewicht > 0 ? summe / gewicht : 3) * (KNOTEN.has(stadt) ? 0.8 : 1);
}

export interface Standort {
  stadt: string; region: Region; cluster: Cluster; reiseIndex: number; ballungsraum: boolean; knoten: boolean;
  reiseJeFte: number; lohnFaktor: number; recruitingFaktor: number; wirkungsFaktor: number; marketingEcommerceFaktor: number;
}

/** Was ein Standort für die Zentrale bedeutet: Erreichbarkeit der Häuser, Lohnniveau, Fachkräfte. */
export function standort(s: GameState, stadt: string): Standort {
  const { region, cluster } = stadtDaten(stadt);
  const ri = reiseIndex(s, stadt);
  const c = HQ_STANDORT[cluster];
  // Außerhalb der Ballungsräume ist der Fachkräftepool kleiner
  const pool = BALLUNGSRAUM.has(stadt);
  const poolWirkung = pool || cluster === 'metropole' ? 1 : cluster === 'grossstadt' ? 0.97 : 1;
  const poolRecruiting = pool || cluster === 'metropole' ? 1 : cluster === 'grossstadt' ? 1.15 : 1;
  return {
    stadt, region, cluster, reiseIndex: ri, ballungsraum: pool, knoten: KNOTEN.has(stadt),
    reiseJeFte: HQ_PARAM.reiseJeFte * ri,
    lohnFaktor: c.lohn,
    recruitingFaktor: c.recruiting * poolRecruiting,
    wirkungsFaktor: clamp(1 - HQ_PARAM.reiseWirkung * (ri - (s.hq?.reiseBasis ?? ri)), 0.8, 1.03) * c.wirkung * poolWirkung,
    marketingEcommerceFaktor: c.marketingEcommerce,
  };
}

/** Stadt, in der eine Abteilung arbeitet (ohne Fläche: am Sitz). */
function abteilungsStadt(s: GameState, a: Abteilung): string {
  return gebaeude(s, a.gebaeudeId)?.stadt ?? s.hq.sitz;
}

/** Tatsächlich verfügbare qm einer Abteilung (nur gemietete Etagen ihres Gebäudes). */
export function platzQm(s: GameState, a: Abteilung): number {
  const g = gebaeude(s, a.gebaeudeId);
  if (!g) return 0;
  return (a.belegung ?? []).reduce((x, b) => x + (g.etagen.find((e) => e.nr === b.etage)?.gemietet ? b.qm : 0), 0);
}

/** Belegte qm einer Etage (optional ohne eine Abteilung). */
export function belegtQm(s: GameState, g: HqGebaeude, e: HqEtage, ohne?: AbteilungId): number {
  let x = 0;
  for (const a of s.hq.abteilungen) if (a.gebaeudeId === g.id && a.id !== ohne) for (const b of a.belegung ?? []) if (b.etage === e.nr) x += b.qm;
  return x;
}

export function freiQm(s: GameState, g: HqGebaeude, e: HqEtage, ohne?: AbteilungId): number {
  return e.gemietet ? Math.max(0, e.qm - belegtQm(s, g, e, ohne)) : 0;
}

/** Plant eine Belegung ab Etage start (erst aufwärts, dann abwärts). null, wenn das Gebäude nicht reicht. */
function planeBelegung(s: GameState, g: HqGebaeude, start: number, qm: number, ohne?: AbteilungId): { etage: number; qm: number }[] | null {
  const oben = (e: HqEtage) => e.nr >= start;
  const reihe = g.etagen.filter((e) => e.gemietet).sort((a, b) => (oben(a) ? 0 : 1) - (oben(b) ? 0 : 1) || (oben(a) ? a.nr - b.nr : b.nr - a.nr));
  let rest = qm;
  const out: { etage: number; qm: number }[] = [];
  for (const e of reihe) {
    if (rest <= 0) break;
    const f = freiQm(s, g, e, ohne);
    // keine Splitter: Restflächen unter 100 qm nur nutzen, wenn die Abteilung damit fertig wird
    if (f <= 0 || (f < 100 && f < rest)) continue;
    const n = Math.min(f, rest);
    out.push({ etage: e.nr, qm: n });
    rest -= n;
  }
  return rest > 0 ? null : out;
}

function vereinige(a: { etage: number; qm: number }[], b: { etage: number; qm: number }[]): { etage: number; qm: number }[] {
  const out = a.map((x) => ({ ...x }));
  for (const y of b) { const x = out.find((z) => z.etage === y.etage); if (x) x.qm += y.qm; else out.push({ ...y }); }
  return out;
}

/** Gibt Fläche von hinten frei, bis die Belegung zum Bedarf passt. */
function schrumpfe(a: Abteilung, ziel: number): void {
  const b = a.belegung ?? [];
  let zuviel = b.reduce((x, y) => x + y.qm, 0) - ziel;
  for (let i = b.length - 1; i >= 0 && zuviel > 0; i--) {
    const weg = Math.min(b[i].qm, zuviel);
    b[i].qm -= weg;
    zuviel -= weg;
  }
  a.belegung = b.filter((x) => x.qm > 0);
}

/** Etagenlisten aus den Belegungen ableiten. */
function syncEtagen(s: GameState): void {
  for (const g of s.hq.gebaeude) for (const e of g.etagen) {
    e.abteilungen = ABTEILUNGEN.filter((id) => { const a = abteilung(s, id); return a.gebaeudeId === g.id && (a.belegung ?? []).some((b) => b.etage === e.nr && b.qm > 0); });
  }
  for (const a of s.hq.abteilungen) {
    if (!a.belegung?.length || !gebaeude(s, a.gebaeudeId)) { a.gebaeudeId = undefined; a.etage = undefined; a.belegung = undefined; }
    else a.etage = a.belegung[0].etage;
  }
}

/** Städte, in denen Abteilungen sitzen. */
export function hqStaedte(s: GameState): string[] {
  const st = new Set<string>();
  for (const a of s.hq.abteilungen) { const g = gebaeude(s, a.gebaeudeId); if (g && platzQm(s, a) > 0) st.add(g.stadt); }
  return [...st].sort();
}

/** Besetzungsstufe (stetig 0..stufe) aus FTE gegen Soll, mit Einarbeitung. */
function besetzungsStufe(s: GameState, a: Abteilung): number {
  const w = s.woche;
  const fteEff = a.fte - (a.einarbeitungBis !== undefined && a.einarbeitungBis > w ? (a.neuFte ?? 0) * 0.5 : 0);
  const tol = HQ_PARAM.toleranz;
  let L = 0;
  if (fteEff >= sollFte(s, a.id, a.stufe) * tol) L = a.stufe;
  else {
    for (let k = a.stufe - 1; k >= 0; k--) {
      const unten = sollFte(s, a.id, k as Stufe) * tol;
      if (fteEff >= unten) {
        const oben = sollFte(s, a.id, (k + 1) as Stufe) * tol;
        L = k + (fteEff - unten) / Math.max(1e-9, oben - unten);
        break;
      }
    }
  }
  return L;
}

/** Wirksame Stufe (stetig 0..3): Besetzung (verzögert beim Abbau), Platz, Umzug, Standort, Verteilung. */
function wirksameStufe(s: GameState, a: Abteilung, verteilung: number): number {
  const ziel = besetzungsStufe(s, a);
  const stand = s.hq.stand[a.id] ?? ziel;
  if (ziel >= stand) s.hq.stand[a.id] = ziel;
  let L = Math.max(ziel, stand);
  const platz = platzQm(s, a);
  if (platz <= 0) return 0;
  const w = s.woche;
  const st = standort(s, abteilungsStadt(s, a));
  L *= st.wirkungsFaktor * (a.id === 'marketing' || a.id === 'ecommerce' ? st.marketingEcommerceFaktor : 1);
  const bedarf = qmBedarf(a);
  if (bedarf > 0 && platz < bedarf) L *= platz / bedarf; // zu wenig Fläche
  if (a.umzugBis !== undefined && a.umzugBis > w) L *= 0.5;
  return Math.min(3, L * verteilung);
}

export function verteilungsFaktor(s: GameState): number {
  const n = hqStaedte(s).length;
  return Math.max(HQ_PARAM.verteilungMin, 1 - HQ_PARAM.verteilungJeStadt * Math.max(0, n - 1));
}

export interface HqKosten { personal: number; sach: number; reise: number; miete: number; nebenkosten: number; strafen: number; vorstand: number; entwicklung: number; leitung: number; gesamt: number }

export function hqKosten(s: GameState): HqKosten {
  const hq = s.hq;
  let personal = 0;
  let fte = 0;
  let reise = 0;
  const cache = new Map<string, Standort>();
  for (const a of hq.abteilungen) {
    const stadt = abteilungsStadt(s, a);
    let st = cache.get(stadt);
    if (!st) { st = standort(s, stadt); cache.set(stadt, st); }
    personal += a.fte * HQ_PARAM.lohn[a.id] * st.lohnFaktor;
    reise += a.fte * st.reiseJeFte;
    fte += a.fte;
  }
  const sach = fte * hq.sachJeFte;
  let miete = 0;
  let nebenkosten = 0;
  for (const g of hq.gebaeude) for (const e of g.etagen) if (e.gemietet) {
    miete += wochenMiete(e.qm, g.mieteQmMonat);
    // Separater kleiner Archiv-Zuschlag; alle anderen Simulationsgrößen bleiben unberührt.
    if (ARCHIV_AKTIV && e.archiv) miete += wochenMiete(ARCHIV_QM, g.mieteQmMonat);
    nebenkosten += wochenMiete(e.qm, g.nebenkostenQmMonat);
  }
  const Lv = hq.wirkung.verwaltung;
  const strafen = Math.max(0, 1 - Lv) * HQ_PARAM.verwaltungStrafe * s.zentrale.kostenStart;
  const vorstand = vorstandKostenWoche(s);
  const entwicklung = produktKostenWoche(s);
  const leitung = organisationLeitungKostenWoche(s);
  return { personal, sach, reise, miete, nebenkosten, strafen, vorstand, entwicklung, leitung, gesamt: personal + sach + reise + miete + nebenkosten + strafen + vorstand + entwicklung + leitung };
}

/** Rechnet wirksame Stufen, Zentralkosten und Controllingstufe neu. Nach jeder HQ-Änderung aufrufen. */
export function hqAktualisiere(s: GameState): void {
  const hq = s.hq;
  syncEtagen(s);
  const v = verteilungsFaktor(s);
  // Vorstand: Führung des Ressorts verstärkt oder schwächt die Abteilungen (Start = 1)
  for (const a of hq.abteilungen) hq.wirkung[a.id] = Math.min(3, wirksameStufe(s, a, v) * vorstandWirkung(s, a.id));
  const k = hqKosten(s);
  s.zentrale.kostenWoche = eur(k.gesamt);
  s.zentrale.fte = Math.round(hq.abteilungen.reduce((x, a) => x + a.fte, 0));
  const c = Math.round(hq.wirkung.controlling);
  s.controllingStufe = c <= 0 ? 0 : c === 1 ? 1 : 2;
}

// ---------------------------------------------------------------------------------------------
// Wirkungen (Zugriff für wirtschaft, engine, stakeholder, prozesse, aktionen, ereignisse)
// ---------------------------------------------------------------------------------------------

const L = (s: GameState, id: AbteilungId): number => s.hq?.wirkung[id] ?? 1;
const W = HQ_WIRKUNG;

export const hqEinkaufKonditionen = (s: GameState): number => kurve(L(s, 'einkauf'), W.einkaufKonditionen);
export const hqWkzFaktor = (s: GameState): number => 1 + kurve(L(s, 'einkauf'), W.einkaufWkz);
export const hqMarketingFaktor = (s: GameState): number => 1 + kurve(L(s, 'marketing'), W.marketing);
export const hqUmsatzFaktor = (s: GameState): number => (1 + kurve(L(s, 'ecommerce'), W.ecommerce)) * (1 + kurve(L(s, 'vm'), W.vm));
export const hqBesetzungsNorm = (s: GameState): number => 0.92 + kurve(L(s, 'personal'), W.personalBesetzung);
export const hqBetriebsratZiel = (s: GameState): number => kurve(L(s, 'personal'), W.personalBetriebsrat);
export const hqMoralZiel = (s: GameState): number => kurve(L(s, 'personal'), W.personalMoral);
export const hqVerhandlungsBonus = (s: GameState): number => kurve(L(s, 'immobilien'), W.immobilienVerhandlung);
export const hqAnfrageFaktor = (s: GameState): number => 1 + kurve(L(s, 'immobilien'), W.immobilienAnfragen);
export const hqUntermietFaktor = (s: GameState): number => 1 + kurve(L(s, 'immobilien'), W.immobilienMiete);
export const hqMietendeFaktor = (s: GameState): number => 1 + kurve(L(s, 'immobilien'), W.immobilienMietende);
export const hqLogistikFaktor = (s: GameState): number => 1 + kurve(L(s, 'logistik'), W.logistik);
export const hqRechtFaktor = (s: GameState): number => 1 + kurve(L(s, 'recht'), W.recht);
/** Controlling Stufe 3: Exzellenz (genauere Aktionsmessung, Vertrauensbonus bei Bank und Kreditversicherer). */
export const hqControllingExzellenz = (s: GameState): boolean => L(s, 'controlling') >= 2.5;
/** Verwaltung unter Stufe 1: Malus auf das Bankvertrauen (Fristen, Meldungen, Zahlungsverkehr). */
export const hqVerwaltungMalus = (s: GameState): number => Math.max(0, 1 - L(s, 'verwaltung')) * 10;

export function hqRestmieteWoche(s: GameState): number {
  return s.hq.restmieten.filter((r) => r.bis > s.woche).reduce((x, r) => x + r.mieteWoche, 0);
}

// ---------------------------------------------------------------------------------------------
// Startzustand und Angebote
// ---------------------------------------------------------------------------------------------

/** Baut die alte, zu große Hauptverwaltung in Essen (Hochhaus mit 12 Etagen plus Verwaltungsscheibe, 1960er)
 *  und kalibriert sie auf die bisherigen Zentralkosten. */
export function erzeugeHq(s: GameState, zielKostenWoche: number): Hq {
  const P = HQ_PARAM;
  const miete = 11.5;
  const nk = 4.8;
  // Raumkosten je FTE bei 25 % Leerfläche
  const raumJeFte = (P.qmJeFte / (1 - P.startLeerquote)) * ((miete + nk) * 12) / 52;
  const rohSumme = ABTEILUNGEN.reduce((x, id) => x + P.normRoh[id] * P.ueberbesetzungStart[id] * (P.lohn[id] + P.sachJeFteRichtwert + raumJeFte), 0);
  const skala = zielKostenWoche / rohSumme;
  const normFte = Object.fromEntries(ABTEILUNGEN.map((id) => [id, P.normRoh[id] * skala])) as Record<AbteilungId, number>;
  const abteilungen: Abteilung[] = ABTEILUNGEN.map((id) => ({ id, stufe: 1, fte: Math.round(normFte[id] * P.ueberbesetzungStart[id]) }));
  const summe = abteilungen.reduce((x, a) => x + qmBedarf(a), 0);
  const hochN = 12;
  const hochQm = 1250;
  const scheibeQm = 1300;
  const nScheibe = Math.max(2, Math.round((summe / (1 - P.startLeerquote) - hochN * hochQm) / scheibeQm));
  const bau = (n: number, qm: number): HqEtage[] => Array.from({ length: n }, (_, nr) => ({ nr, qm, gemietet: true, abteilungen: [] as AbteilungId[] }));
  const scheibe: HqGebaeude = {
    id: 'hq-essen-scheibe', name: 'Hartwig-Verwaltungsscheibe Brehmstraße', stadt: 'Essen', typ: 'nachkrieg',
    etagen: bau(nScheibe, scheibeQm), mieteQmMonat: miete, nebenkostenQmMonat: nk, bisWoche: 130, seitWoche: -52 * 58,
    vermieter: 'Rheinruhr Büroimmobilien GmbH',
  };
  const hoch: HqGebaeude = {
    id: 'hq-essen', name: 'Hartwig-Hochhaus Brehmstraße', stadt: 'Essen', typ: 'nachkrieg',
    etagen: bau(hochN, hochQm), mieteQmMonat: miete, nebenkostenQmMonat: nk, bisWoche: 130, seitWoche: -52 * 56,
    vermieter: 'Rheinruhr Büroimmobilien GmbH',
  };
  // Belegen: jede Etage nur zu gut drei Vierteln, oben im Hochhaus bleibt Leerstand (die Zentrale ist zu groß)
  const reihenfolge: AbteilungId[] = ['verwaltung', 'personal', 'recht', 'einkauf', 'produkt', 'marketing', 'vm', 'ecommerce', 'logistik', 'controlling', 'immobilien'];
  const haeuser = [scheibe, hoch];
  const fuellen = (quote: number): boolean => {
    const frei = new Map<HqEtage, number>();
    for (const g of haeuser) for (const e of g.etagen) frei.set(e, e.qm * quote);
    let gi = 0;
    for (const id of reihenfolge) {
      const a = abteilungen.find((x) => x.id === id)!;
      let platziert = false;
      for (; gi < haeuser.length && !platziert; ) {
        const g = haeuser[gi];
        const kap = g.etagen.reduce((x, e) => x + (frei.get(e) ?? 0), 0);
        if (kap < qmBedarf(a)) { gi++; continue; }
        let rest = qmBedarf(a);
        const bel: { etage: number; qm: number }[] = [];
        for (const e of g.etagen) {
          const f = Math.floor(frei.get(e) ?? 0);
          if (rest <= 0) break;
          if (f <= 0) continue;
          const n = Math.min(f, rest);
          bel.push({ etage: e.nr, qm: n });
          frei.set(e, (frei.get(e) ?? 0) - n);
          rest -= n;
        }
        a.gebaeudeId = g.id;
        a.belegung = bel;
        a.etage = bel[0].etage;
        platziert = true;
      }
      if (!platziert) return false;
    }
    return true;
  };
  for (let q = 0.8; !fuellen(q); q = Math.min(1, q + 0.05)) for (const a of abteilungen) { a.belegung = undefined; a.gebaeudeId = undefined; a.etage = undefined; }
  const wirkung = Object.fromEntries(ABTEILUNGEN.map((id) => [id, 1])) as Record<AbteilungId, number>;
  const hausBasis = s.haeuser.reduce((a, h) => a + hausGewicht(h), 0);
  const hq: Hq = {
    gebaeude: [hoch, scheibe], abteilungen, angebote: [], sitz: 'Essen', rng: (s.seed * 2654435761 + 0x48510) >>> 0,
    normFte, sachJeFte: 0, hausBasis, wirkung, stand: { ...wirkung }, reiseBasis: 0, restmieten: [], zaehler: 0,
  };
  s.hq = hq;
  hq.reiseBasis = reiseIndex(s, 'Essen');
  const reise = abteilungen.reduce((x, a) => x + a.fte, 0) * P.reiseJeFte * hq.reiseBasis;
  // Sachkosten so setzen, dass der Start die bisherige Zentralkostenquote exakt trifft
  const fte = abteilungen.reduce((x, a) => x + a.fte, 0);
  const personal = abteilungen.reduce((x, a) => x + a.fte * P.lohn[a.id], 0);
  const raum = haeuser.reduce((x, g) => x + g.etagen.reduce((y, e) => y + wochenMiete(e.qm, miete) + wochenMiete(e.qm, nk), 0), 0);
  hq.sachJeFte = (zielKostenWoche - personal - raum - reise) / fte;
  return hq;
}

function neueHqId(hq: Hq, prefix: string): string {
  hq.zaehler += 1;
  return `${prefix}${hq.zaehler}`;
}

function preisRahmen(cluster: Haus['cluster']): [number, number] {
  return cluster === 'metropole' ? [19, 27] : cluster === 'grossstadt' ? [11.5, 16] : [8.5, 12];
}

/** Erzeugt 2 bis 4 freie Bürogebäude in Städten mit offenen Hartwig-Häusern. */
export function neueHqAngebote(s: GameState): void {
  const hq = s.hq;
  const r: RngHalter = hq;
  const staedte = new Map<string, Haus['cluster']>();
  for (const h of s.haeuser) if (h.status === 'offen' && !staedte.has(h.stadt)) staedte.set(h.stadt, h.cluster);
  const liste = [...staedte.keys()];
  if (!liste.length) return;
  const anzahl = ganzZwischen(r, 2, 4);
  const gewaehlt: string[] = [];
  // Der Sitz ist häufiger dabei, damit ein Umzug in derselben Stadt möglich ist
  if (staedte.has(hq.sitz) && zwischen(r, 0, 1) < 0.5) gewaehlt.push(hq.sitz);
  for (let i = 0; gewaehlt.length < anzahl && i < 20; i++) {
    const st = waehle(r, liste);
    if (!gewaehlt.includes(st)) gewaehlt.push(st);
  }
  const typen = Object.keys(HQ_TYPEN) as HqTyp[];
  const immo = 1 + kurve(hq.wirkung.immobilien, HQ_WIRKUNG.immobilienBuero);
  for (const stadt of gewaehlt) {
    const typ = waehle(r, typen);
    const tp = HQ_TYPEN[typ];
    const [p0, p1] = preisRahmen(staedte.get(stadt) ?? 'grossstadt');
    const n = ganzZwischen(r, tp.etagen[0], tp.etagen[1]);
    const qm = Math.round(zwischen(r, tp.qm[0], tp.qm[1]) / 50) * 50;
    const etagen: HqEtage[] = Array.from({ length: n }, (_, nr) => ({ nr, qm, gemietet: false, abteilungen: [] }));
    const id = neueHqId(hq, 'hqg');
    const g: HqGebaeude = {
      id, name: `${tp.name} ${waehle(r, LAGEN)}`, stadt, typ, etagen,
      mieteQmMonat: Math.round(zwischen(r, p0, p1) * tp.preis * immo * 10) / 10,
      nebenkostenQmMonat: Math.round(tp.nk * zwischen(r, 0.9, 1.1) * 10) / 10,
      bisWoche: 0, seitWoche: 0, vermieter: waehle(r, VERMIETER_HQ),
    };
    hq.angebote.push({ id: neueHqId(hq, 'hqa'), gebaeude: g, frist: s.woche + 13, laufzeitJahre: ganzZwischen(r, 5, 10) });
  }
  melde(s, 'ereignis', `Büromarkt: ${gewaehlt.length} freie Bürogebäude für die Zentrale (${gewaehlt.join(', ')}).`);
}

/** Wöchentlicher HQ-Takt: Angebote, Umzüge, Einarbeitung, Restmieten, Vertragsenden, Kosten. */
export function hqWoche(s: GameState): void {
  const hq = s.hq;
  const w = s.woche;
  // Angebote kommen aus dem eigenen Zufallsstrom und laufen auch in Prognosen gleich
  if (w > 0 && w % 13 === 0) neueHqAngebote(s);
  // Abbau schlägt verzögert auf die Wirkung durch
  for (const a of hq.abteilungen) {
    const ziel = besetzungsStufe(s, a);
    const stand = hq.stand[a.id] ?? ziel;
    hq.stand[a.id] = ziel >= stand ? ziel : stand + (ziel - stand) * HQ_PARAM.traegheit;
  }
  hq.angebote = hq.angebote.filter((a) => a.frist > w);
  for (const a of hq.abteilungen) {
    if (a.umzugBis !== undefined && a.umzugBis <= w) a.umzugBis = undefined;
    if (a.einarbeitungBis !== undefined && a.einarbeitungBis <= w) { a.einarbeitungBis = undefined; a.neuFte = undefined; }
  }
  hq.restmieten = hq.restmieten.filter((r) => r.bis > w);
  for (const g of hq.gebaeude) {
    if (g.bisWoche - 13 === w) melde(s, 'warnung', `Der Mietvertrag für ${g.name} (${g.stadt}) endet in 13 Wochen. Ohne Kündigung verlängert er sich um 5 Jahre.`, { stadt: g.stadt, modul: 'zentrale' });
    if (g.bisWoche === w) {
      g.bisWoche = w + 260;
      melde(s, 'info', `Der Mietvertrag für ${g.name} hat sich um 5 Jahre verlängert.`, { stadt: g.stadt, modul: 'zentrale' });
    }
  }
  hqAktualisiere(s);
}

// ---------------------------------------------------------------------------------------------
// Aktionen
// ---------------------------------------------------------------------------------------------

export interface HqErgebnis { ok: boolean; text: string }
const ok = (text: string): HqErgebnis => ({ ok: true, text });
const fehler = (text: string): HqErgebnis => ({ ok: false, text });

function einmal(s: GameState, betrag: number): void {
  s.cash -= eur(betrag);
  s.einmalkostenWoche += eur(betrag);
}

const etageText = (nr: number): string => (nr === 0 ? 'EG' : `${nr}. OG`);

function abfindungJeFte(s: GameState): number {
  return (s.phase === 'insolvenz' ? HQ_PARAM.abfindungInsolvenz : HQ_PARAM.abfindungRegulaer) * hqRechtFaktor(s);
}

function restmietWochen(s: GameState, g: HqGebaeude): number {
  const basis = s.phase === 'insolvenz' ? 13 : 52;
  return Math.max(0, Math.min(basis, g.bisWoche - s.woche));
}

/** Entfernt alle Belegungen einer Etage. Liefert die betroffenen Abteilungen. */
function raeumeEtage(s: GameState, g: HqGebaeude, e: HqEtage): AbteilungId[] {
  const betroffen: AbteilungId[] = [];
  for (const a of s.hq.abteilungen) {
    if (a.gebaeudeId !== g.id || !(a.belegung ?? []).some((b) => b.etage === e.nr)) continue;
    a.belegung = (a.belegung ?? []).filter((b) => b.etage !== e.nr);
    betroffen.push(a.id);
  }
  return betroffen;
}

function pruefeSitz(s: GameState): void {
  const hq = s.hq;
  if (hq.gebaeude.some((g) => g.stadt === hq.sitz && g.etagen.some((e) => e.gemietet))) return;
  const fteJeStadt = new Map<string, number>();
  for (const a of hq.abteilungen) { const g = gebaeude(s, a.gebaeudeId); if (g) fteJeStadt.set(g.stadt, (fteJeStadt.get(g.stadt) ?? 0) + a.fte); }
  const neu = [...fteJeStadt.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0]
    ?? hq.gebaeude.find((g) => g.etagen.some((e) => e.gemietet))?.stadt;
  if (neu && neu !== hq.sitz) {
    melde(s, 'presse', `${s.firma.name} verlegt den Firmensitz von ${hq.sitz} nach ${neu}.`);
    hq.sitz = neu;
  }
}

/** Mietet Etagen aus einem Angebot (oder weitere Etagen eines bereits gemieteten Gebäudes). */
export function hqMieten(s: GameState, angebotId: string, etagen: number[]): HqErgebnis {
  const hq = s.hq;
  const an = hq.angebote.find((a) => a.id === angebotId);
  const vorhanden = an ? undefined : hq.gebaeude.find((g) => g.id === angebotId);
  const g = an?.gebaeude ?? vorhanden;
  if (!g) return fehler('Angebot nicht gefunden oder abgelaufen.');
  const nrs = [...new Set(etagen)];
  if (!nrs.length) return fehler('Bitte mindestens eine Etage wählen.');
  const ziel = nrs.map((nr) => g.etagen.find((e) => e.nr === nr));
  if (ziel.some((e) => !e)) return fehler('Diese Etage gibt es in dem Gebäude nicht.');
  if (ziel.some((e) => e!.gemietet)) return fehler('Mindestens eine Etage ist bereits gemietet.');
  const qm = ziel.reduce((x, e) => x + e!.qm, 0);
  const ausbau = qm * HQ_TYPEN[g.typ].ausbau;
  einmal(s, ausbau);
  for (const e of ziel) e!.gemietet = true;
  if (an) {
    g.seitWoche = s.woche;
    g.bisWoche = s.woche + an.laufzeitJahre * 52;
    hq.gebaeude.push(g);
    hq.angebote = hq.angebote.filter((a) => a !== an);
    melde(s, 'presse', `Die Zentrale von ${s.firma.name} mietet ${qm.toLocaleString('de-DE')} qm im ${g.name} in ${g.stadt}.`, { stadt: g.stadt, modul: 'zentrale' });
  }
  hqAktualisiere(s);
  const jahr = wochenMiete(qm, g.mieteQmMonat + g.nebenkostenQmMonat) * 52;
  return ok(`${g.name} (${g.stadt}): ${nrs.length} Etage${nrs.length > 1 ? 'n' : ''} mit ${qm.toLocaleString('de-DE')} qm gemietet, ${mio(jahr)} im Jahr warm, Herrichtung ${mio(ausbau)}${an ? `, Laufzeit ${an.laufzeitJahre} Jahre` : ''}.`);
}

function kuendigeEtagen(s: GameState, g: HqGebaeude, es: HqEtage[]): { rest: number; wochen: number; ohnePlatz: AbteilungId[] } {
  const qm = es.reduce((x, e) => x + e.qm, 0);
  const wochen = restmietWochen(s, g);
  const rest = eur(wochenMiete(qm, g.mieteQmMonat) * hqRechtFaktor(s));
  if (wochen > 0 && rest > 0) s.hq.restmieten.push({ text: `${g.name} (${g.stadt})`, mieteWoche: rest, bis: s.woche + wochen });
  const ohnePlatz: AbteilungId[] = [];
  for (const e of es) { for (const id of raeumeEtage(s, g, e)) if (!ohnePlatz.includes(id)) ohnePlatz.push(id); e.gemietet = false; e.archiv = false; }
  return { rest, wochen, ohnePlatz };
}

/** Freiwillige historische Sammlung auf einer bereits gemieteten Etage. Nur Zusatzmiete. */
export function hqArchivSetzen(s: GameState, gebaeudeId: string, nr: number, aktiv: boolean): HqErgebnis {
  if (!ARCHIV_AKTIV) return fehler('Das Archiv ist in den Einstellungen deaktiviert.');
  const g = gebaeude(s, gebaeudeId);
  const e = g?.etagen.find((x) => x.nr === nr);
  if (!g || !e || !e.gemietet) return fehler('Für das Archiv ist eine gemietete HQ-Etage erforderlich.');
  if (!!e.archiv === aktiv) return fehler(aktiv ? 'Auf dieser Etage befindet sich bereits ein Archiv.' : 'Hier ist kein Archiv eingerichtet.');
  if (aktiv && s.hq.gebaeude.some((bau) => bau.etagen.some((et) => et.archiv))) return fehler('Es gibt bereits eine Archiv-Etage. Bitte zuerst das bestehende Archiv auflösen.');
  e.archiv = aktiv;
  hqAktualisiere(s);
  return ok(aktiv ? `Archiv auf Etage ${etageText(nr)} eingerichtet, zusätzliche Miete ${eur(wochenMiete(ARCHIV_QM, g.mieteQmMonat)).toLocaleString('de-DE')} € je Woche.` : `Archiv auf Etage ${etageText(nr)} aufgelöst. Die Zusatzmiete entfällt.`);
}

export function hqEtageKuendigen(s: GameState, gebaeudeId: string, nr: number): HqErgebnis {
  const g = gebaeude(s, gebaeudeId);
  const e = g?.etagen.find((x) => x.nr === nr);
  if (!g || !e) return fehler('Etage nicht gefunden.');
  if (!e.gemietet) return fehler('Die Etage ist nicht gemietet.');
  const r = kuendigeEtagen(s, g, [e]);
  if (!g.etagen.some((x) => x.gemietet)) s.hq.gebaeude = s.hq.gebaeude.filter((x) => x !== g);
  pruefeSitz(s);
  hqAktualisiere(s);
  return ok(`${etageText(nr)} im ${g.name} gekündigt. Restmiete ${mio(r.rest * r.wochen)} über ${r.wochen} Wochen${r.ohnePlatz.length ? `. Fläche verloren und damit weniger Wirkung: ${r.ohnePlatz.map((id) => ABTEILUNG_NAME[id]).join(', ')}` : ''}.`);
}

export function hqGebaeudeKuendigen(s: GameState, gebaeudeId: string): HqErgebnis {
  const g = gebaeude(s, gebaeudeId);
  if (!g) return fehler('Gebäude nicht gefunden.');
  const es = g.etagen.filter((e) => e.gemietet);
  const r = kuendigeEtagen(s, g, es);
  s.hq.gebaeude = s.hq.gebaeude.filter((x) => x !== g);
  pruefeSitz(s);
  hqAktualisiere(s);
  return ok(`${g.name} (${g.stadt}) gekündigt. Restmiete ${mio(r.rest * r.wochen)} über ${r.wochen} Wochen${r.ohnePlatz.length ? `. Ohne Platz und damit ohne Wirkung: ${r.ohnePlatz.map((id) => ABTEILUNG_NAME[id]).join(', ')}` : ''}.`);
}

export function abteilungSetzen(s: GameState, id: AbteilungId, gebaeudeId: string, nr: number): HqErgebnis {
  if (!ABTEILUNGEN.includes(id)) return fehler('Unbekannte Abteilung.');
  const a = abteilung(s, id);
  const g = gebaeude(s, gebaeudeId);
  const e = g?.etagen.find((x) => x.nr === nr);
  if (!g || !e) return fehler('Etage nicht gefunden.');
  if (!e.gemietet) return fehler('Die Etage ist nicht gemietet.');
  const bedarf = qmBedarf(a);
  if (a.gebaeudeId === gebaeudeId && a.etage === nr && platzQm(s, a) >= bedarf) return fehler(`${ABTEILUNG_NAME[id]} sitzt bereits dort.`);
  const gleichesHaus = a.gebaeudeId === gebaeudeId;
  const plan = planeBelegung(s, g, nr, bedarf, gleichesHaus ? id : undefined);
  if (!plan) {
    const frei = g.etagen.reduce((x, y) => x + freiQm(s, g, y, gleichesHaus ? id : undefined), 0);
    return fehler(`Zu wenig Platz: ${ABTEILUNG_NAME[id]} braucht ${Math.round(bedarf)} qm, in ${g.name} sind ${Math.round(frei)} qm frei.`);
  }
  const kosten = a.fte * (gleichesHaus ? HQ_PARAM.umzugJeFteEtage : HQ_PARAM.umzugJeFteGebaeude);
  einmal(s, kosten);
  a.gebaeudeId = gebaeudeId;
  a.belegung = plan;
  a.etage = plan[0].etage;
  a.umzugBis = s.woche + HQ_PARAM.umzugWochen;
  pruefeSitz(s);
  hqAktualisiere(s);
  const n = plan.length;
  return ok(`${ABTEILUNG_NAME[id]} zieht ins ${etageText(plan[0].etage)} von ${g.name} (${g.stadt})${n > 1 ? `, verteilt auf ${n} Etagen` : ''}. Umzug ${mio(kosten)}, ${HQ_PARAM.umzugWochen} Wochen halbe Wirkung.`);
}

export function abteilungStufe(s: GameState, id: AbteilungId, stufe: number): HqErgebnis {
  if (!ABTEILUNGEN.includes(id)) return fehler('Unbekannte Abteilung.');
  const st = clamp(Math.round(stufe), 0, 3) as Stufe;
  const a = abteilung(s, id);
  const ziel = Math.round(sollFte(s, id, st));
  const name = ABTEILUNG_NAME[id];
  const alteStufe = a.stufe;
  if (ziel < a.fte) {
    const weg = a.fte - ziel;
    const gesamt = s.hq.abteilungen.reduce((x, b) => x + b.fte, 0);
    const abf = weg * abfindungJeFte(s);
    einmal(s, abf);
    a.fte = ziel;
    a.stufe = st;
    if (a.neuFte !== undefined) a.neuFte = Math.min(a.neuFte, a.fte);
    schrumpfe(a, qmBedarf(a));
    s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - (weg / Math.max(1, gesamt)) * 30, 0, 100);
    hqAktualisiere(s);
    return ok(`${name} auf Stufe ${st}: ${weg} FTE abgebaut, Abfindungen ${mio(abf)}. Neue Kosten ${mio((a.fte * (HQ_PARAM.lohn[id] + s.hq.sachJeFte)) * 52)} im Jahr.`);
  }
  if (ziel > a.fte) {
    const neu = ziel - a.fte;
    const g = gebaeude(s, a.gebaeudeId);
    let zusatz: { etage: number; qm: number }[] | null = [];
    if (g && a.etage !== undefined) {
      const fehlt = ziel * HQ_PARAM.qmJeFte - platzQm(s, a);
      if (fehlt > 0) zusatz = planeBelegung(s, g, a.etage, fehlt);
      if (!zusatz) return fehler(`In ${g.name} ist kein Platz für ${ziel} FTE (${Math.round(ziel * HQ_PARAM.qmJeFte)} qm nötig). Erst Etagen mieten oder umziehen.`);
    }
    const kosten = neu * HQ_PARAM.einarbeitungJeFte * standort(s, abteilungsStadt(s, a)).recruitingFaktor;
    einmal(s, kosten);
    if (zusatz.length) a.belegung = vereinige(a.belegung ?? [], zusatz);
    a.fte = ziel;
    a.stufe = st;
    a.neuFte = (a.einarbeitungBis !== undefined && a.einarbeitungBis > s.woche ? a.neuFte ?? 0 : 0) + neu;
    a.einarbeitungBis = s.woche + HQ_PARAM.einarbeitungWochen;
    hqAktualisiere(s);
    return ok(`${name} auf Stufe ${st}: ${neu} FTE eingestellt, Recruiting ${mio(kosten)}. Volle Wirkung nach ${HQ_PARAM.einarbeitungWochen} Wochen Einarbeitung.`);
  }
  a.stufe = st;
  hqAktualisiere(s);
  return ok(alteStufe === st ? `${name} ist bereits passend besetzt.` : `${name} arbeitet ab sofort auf Stufe ${st}.`);
}

/** Bestehende Aktion 'zentrale': kürzt alle Abteilungen anteilig (Stufen bleiben, Besetzung sinkt). */
export function zentraleKuerzen(s: GameState, prozent: number): HqErgebnis {
  const p = clamp(prozent, 0, 0.3);
  let fte = 0;
  for (const a of s.hq.abteilungen) {
    const weg = Math.round(a.fte * p);
    a.fte -= weg;
    if (a.neuFte !== undefined) a.neuFte = Math.min(a.neuFte, a.fte);
    schrumpfe(a, qmBedarf(a));
    fte += weg;
  }
  const abf = fte * abfindungJeFte(s);
  einmal(s, abf);
  s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - p * 30, 0, 100);
  hqAktualisiere(s);
  const gesamt = 1 - s.zentrale.kostenWoche / s.zentrale.kostenStart;
  const unterSoll = s.hq.abteilungen.filter((a) => s.hq.wirkung[a.id] < a.stufe - 0.05).map((a) => ABTEILUNG_NAME[a.id]);
  return ok(`Zentrale um ${Math.round(p * 100)} % verkleinert (${fte} FTE, Abfindungen ${mio(abf)}). Kumuliert ${Math.round(gesamt * 100)} % unter Start${unterSoll.length ? `. Unter Soll und damit schwächer: ${unterSoll.join(', ')}` : ''}${gesamt > 0.3 ? ', die Organisation wird spürbar dünn' : ''}.`);
}

// ---------------------------------------------------------------------------------------------
// Abfragen
// ---------------------------------------------------------------------------------------------

function wirkungText(s: GameState, id: AbteilungId): string {
  const Lx = s.hq.wirkung[id];
  // Werte erst runden, dann Vorzeichen: was gerundet 0 ergibt, gilt als unverändert (nie "-0 %")
  const NULL = 'Standard';
  const pz = (x: number, d = 1) => {
    const f = 10 ** d, r = Math.round(x * 100 * f) / f;
    return r === 0 ? NULL : `${r > 0 ? '+' : ''}${r.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d })} %`;
  };
  const pkt = (x: number) => { const r = Math.round(x); return r === 0 ? NULL : `${r > 0 ? '+' : ''}${r} ${Math.abs(r) === 1 ? 'Punkt' : 'Punkte'}`; };
  /** Teilwirkungen "Bezeichnung Wert"; ist alles auf Standard, heißt es "Marktstandard, Ausbau bringt mehr". */
  const teile = (...l: [string, string][]) => (l.every(([, v]) => v === NULL) ? 'Marktstandard, Ausbau bringt mehr' : l.map(([k, v]) => `${k} ${v}`).join(', '));
  const W = HQ_WIRKUNG;
  switch (id) {
    case 'controlling': {
      const c = s.controllingStufe;
      const t = ['Kennzahlen ungenau, Aktionen schwer messbar', 'Kennzahlen verlässlich', 'präzise Kennzahlen und Aktionsmessung'][c];
      return hqControllingExzellenz(s) ? `${t}, Exzellenz: Bank und Kreditversicherer vertrauen dem Reporting mehr` : t;
    }
    case 'einkauf': return teile(['Einkaufskonditionen (Anteil am Wareneinsatz)', pz(kurve(Lx, W.einkaufKonditionen), 2)], ['Werbekostenzuschüsse', pz(kurve(Lx, W.einkaufWkz), 0)]);
    case 'marketing': return teile(['Wirkung des Marketingbudgets', pz(kurve(Lx, W.marketing), 0)]);
    case 'personal': return teile(['Personalbedarf der Filialen', pz(kurve(Lx, W.personalBesetzung) / 0.92)], ['Betriebsrat', pkt(kurve(Lx, W.personalBetriebsrat))], ['Moral der Filialleitungen', pkt(kurve(Lx, W.personalMoral))]);
    case 'immobilien': return teile(['Erfolgschance bei Mietverhandlungen', pz(kurve(Lx, W.immobilienVerhandlung), 0)], ['Anschlussmieten', pz(kurve(Lx, W.immobilienMietende), 0)], ['Untermietanfragen', pz(kurve(Lx, W.immobilienAnfragen), 0)], ['Preis von Büroangeboten', pz(kurve(Lx, W.immobilienBuero), 0)]);
    case 'logistik': return teile(['Logistikkosten', pz(kurve(Lx, W.logistik))]);
    case 'ecommerce': return teile(['Umsatz über Online und Click and Collect', pz(kurve(Lx, W.ecommerce))]);
    case 'recht': return teile(['Sozialplan, Abfindungen und Restmieten', pz(kurve(Lx, W.recht), 0)]);
    case 'vm': return teile(['Flächenproduktivität', pz(kurve(Lx, W.vm))]);
    case 'produkt': return Lx < 0.95 ? 'Wenig Kapazität und schwächere Produkte bei den Eigenmarken' : Lx > 1.5 ? 'Mehr Sortimentsplätze und bessere Produkte bei den Eigenmarken' : 'Marktstandard, Ausbau bringt mehr Sortimentsplätze und bessere Produkte';
    case 'verwaltung': {
      const st = Math.max(0, 1 - Lx);
      return st > 0.005 ? `Unter Mindeststufe: Strafen und Säumnisse ${mio(st * HQ_PARAM.verwaltungStrafe * s.zentrale.kostenStart * 52)} im Jahr, Bankvertrauen sinkt` : 'Pflichtaufgaben erfüllt (Buchhaltung, Zahlungsverkehr, Meldungen)';
    }
  }
}

export interface HqUebersicht {
  sitz: string;
  staedte: string[];
  verteilungsFaktor: number;
  kostenWoche: number;
  kostenStart: number;
  kosten: HqKosten;
  /** Standortwerte des Sitzes (Reiseindex, Lohnniveau, Recruiting, Wirkung). */
  standort: Standort;
  restmieteWoche: number;
  fte: number;
  gebaeude: {
    id: string; name: string; stadt: string; typ: HqTyp; vermieter: string; mieteQmMonat: number; nebenkostenQmMonat: number;
    bisWoche: number; qmGemietet: number; qmBelegt: number; auslastung: number; kostenWoche: number;
    etagen: { nr: number; qm: number; gemietet: boolean; archiv: boolean; belegtQm: number; auslastung: number; abteilungen: { id: AbteilungId; name: string; qm: number }[] }[];
  }[];
  abteilungen: {
    id: AbteilungId; name: string; stufe: Stufe; wirksameStufe: number; fte: number; sollFte: number; qmBedarf: number;
    gebaeudeId?: string; gebaeude?: string; stadt?: string; etage?: number; etagen: number[]; platzQm: number; umzugBis?: number; einarbeitungBis?: number;
    kostenWoche: number; wirkung: string;
  }[];
  angebote: {
    id: string; name: string; stadt: string; typ: HqTyp; vermieter: string; frist: number; laufzeitJahre: number;
    mieteQmMonat: number; nebenkostenQmMonat: number; herrichtungQm: number; standort: Standort;
    etagen: { nr: number; qm: number; kostenWoche: number }[];
  }[];
}

export function hqUebersicht(s: GameState): HqUebersicht {
  const hq = s.hq;
  const kosten = hqKosten(s);
  return {
    sitz: hq.sitz,
    staedte: hqStaedte(s),
    verteilungsFaktor: verteilungsFaktor(s),
    kostenWoche: s.zentrale.kostenWoche,
    kostenStart: s.zentrale.kostenStart,
    standort: standort(s, hq.sitz),
    kosten: { personal: eur(kosten.personal), sach: eur(kosten.sach), reise: eur(kosten.reise), miete: eur(kosten.miete), nebenkosten: eur(kosten.nebenkosten), strafen: eur(kosten.strafen), vorstand: eur(kosten.vorstand), entwicklung: eur(kosten.entwicklung), leitung: eur(kosten.leitung), gesamt: eur(kosten.gesamt) },
    restmieteWoche: eur(hqRestmieteWoche(s)),
    fte: s.zentrale.fte,
    gebaeude: hq.gebaeude.map((g) => {
      const etagen = g.etagen.map((e) => {
        const belegt = belegtQm(s, g, e);
        return {
          nr: e.nr, qm: e.qm, gemietet: e.gemietet, archiv: !!e.archiv, belegtQm: Math.round(belegt), auslastung: e.qm > 0 ? belegt / e.qm : 0,
          abteilungen: e.abteilungen.map((id) => ({ id, name: ABTEILUNG_NAME[id], qm: Math.round(qmAufEtage(abteilung(s, id), e.nr)) })),
        };
      });
      const qmGemietet = etagen.filter((e) => e.gemietet).reduce((x, e) => x + e.qm, 0);
      const qmBelegt = etagen.reduce((x, e) => x + e.belegtQm, 0);
      return {
        id: g.id, name: g.name, stadt: g.stadt, typ: g.typ, vermieter: g.vermieter, mieteQmMonat: g.mieteQmMonat, nebenkostenQmMonat: g.nebenkostenQmMonat,
        bisWoche: g.bisWoche, qmGemietet, qmBelegt, auslastung: qmGemietet > 0 ? qmBelegt / qmGemietet : 0,
        kostenWoche: eur(wochenMiete(qmGemietet, g.mieteQmMonat + g.nebenkostenQmMonat) + wochenMiete(g.etagen.filter((e) => e.gemietet && e.archiv).length * ARCHIV_QM, g.mieteQmMonat)), etagen,
      };
    }),
    abteilungen: hq.abteilungen.map((a) => {
      const g = gebaeude(s, a.gebaeudeId);
      return {
        id: a.id, name: ABTEILUNG_NAME[a.id], stufe: a.stufe, wirksameStufe: Math.round(hq.wirkung[a.id] * 100) / 100, fte: a.fte,
        sollFte: Math.round(sollFte(s, a.id, a.stufe)), qmBedarf: Math.round(qmBedarf(a)),
        gebaeudeId: a.gebaeudeId, gebaeude: g?.name, stadt: g?.stadt, etage: a.etage, etagen: (a.belegung ?? []).map((b) => b.etage),
        platzQm: Math.round(platzQm(s, a)), umzugBis: a.umzugBis, einarbeitungBis: a.einarbeitungBis,
        kostenWoche: eur(a.fte * (HQ_PARAM.lohn[a.id] + hq.sachJeFte)), wirkung: wirkungText(s, a.id),
      };
    }),
    angebote: hq.angebote.map((an) => ({
      id: an.id, name: an.gebaeude.name, stadt: an.gebaeude.stadt, typ: an.gebaeude.typ, vermieter: an.gebaeude.vermieter, frist: an.frist,
      laufzeitJahre: an.laufzeitJahre, mieteQmMonat: an.gebaeude.mieteQmMonat, nebenkostenQmMonat: an.gebaeude.nebenkostenQmMonat,
      herrichtungQm: HQ_TYPEN[an.gebaeude.typ].ausbau, standort: standort(s, an.gebaeude.stadt),
      etagen: an.gebaeude.etagen.map((e) => ({ nr: e.nr, qm: e.qm, kostenWoche: eur(wochenMiete(e.qm, an.gebaeude.mieteQmMonat + an.gebaeude.nebenkostenQmMonat)) })),
    })),
  };
}

export interface HqGrafik {
  sitz: string;
  gebaeude: { id: string; name: string; stadt: string; typ: HqTyp; etagen: { nr: number; qm: number; gemietet: boolean; archiv: boolean; abteilungen: { id: AbteilungId; fte: number; stufe: Stufe }[] }[] }[];
  angebote: { id: string; stadt: string; typ: HqTyp; etagen: { nr: number; qm: number }[] }[];
  /** Vorstandsetage (oberste gemietete Etage am Sitz) mit Namensschildern je Ressort. */
  vorstand?: { etage?: { gebaeudeId: string; nr: number }; ressorts: ReturnType<typeof vorstandFuerGrafik> };
}

/** Reines JSON für die Grafik (render/src/kit/hq.js). */
export function hqFuerGrafik(s: GameState): HqGrafik {
  const hq = s.hq;
  return {
    sitz: hq.sitz,
    gebaeude: hq.gebaeude.map((g) => ({
      id: g.id, name: g.name, stadt: g.stadt, typ: g.typ,
      etagen: g.etagen.map((e) => ({
        nr: e.nr, qm: e.qm, gemietet: e.gemietet, archiv: !!e.archiv,
        // FTE je Etage: Anteil der Abteilung, der auf dieser Etage sitzt
        abteilungen: e.abteilungen.map((id) => { const a = abteilung(s, id); return { id, fte: Math.round(qmAufEtage(a, e.nr) / HQ_PARAM.qmJeFte), stufe: a.stufe }; }),
      })),
    })),
    angebote: hq.angebote.map((an) => ({ id: an.id, stadt: an.gebaeude.stadt, typ: an.gebaeude.typ, etagen: an.gebaeude.etagen.map((e) => ({ nr: e.nr, qm: e.qm })) })),
    vorstand: { etage: vorstandEtage(s), ressorts: vorstandFuerGrafik(s) },
  };
}

function vorstandEtage(s: GameState): { gebaeudeId: string; nr: number } | undefined {
  const g = s.hq.gebaeude.find((x) => x.stadt === s.hq.sitz && x.etagen.some((e) => e.gemietet)) ?? s.hq.gebaeude.find((x) => x.etagen.some((e) => e.gemietet));
  const e = g ? [...g.etagen].reverse().find((x) => x.gemietet) : undefined;
  return g && e ? { gebaeudeId: g.id, nr: e.nr } : undefined;
}

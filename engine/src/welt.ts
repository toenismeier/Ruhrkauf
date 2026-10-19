import {
  CLUSTER_FAKTOR, GRUPPEN, LAGE_FAKTOR, LIEFERANTEN, NACHNAMEN, STAEDTE, STANDORT_ZUSATZ, VERMIETER, VORNAMEN,
  BERATER, gruppenFuer,
} from './daten';
import type { Cluster, Flaeche, Format, GameState, GruppeId, Haus, Kohorte, Lage, Region } from './types';
import { chance, clamp, eur, ganzZwischen, waehle, zwischen, type RngHalter } from './util';
import { erzeugeHq, hqAktualisiere, neueHqAngebote } from './hq';
import { erzeugeEinkauf, initialisiereEinkauf } from './einkauf';
import { erzeugeEigenmarken } from './eigenmarken';
import { erzeugeVorstand, vorstandKostenWoche } from './vorstand';
import { erzeugeProdukte } from './produkte';
import { erzeugeMarketing, initialisiereMarketing } from './marketing';
import { SCHWIERIGKEIT, type SchwierigkeitId } from './schwierigkeit';

export interface Szenario {
  warenhaeuser: number;
  sporthaeuser: number;
  startCash: number;
  kreditlinie: number;
  firma: string;
  sportName: string;
  startJahr: number;
  /** Schwierigkeit (Standard mittel = Kalibrierung). */
  schwierigkeit?: SchwierigkeitId;
}

export const STANDARD_SZENARIO: Szenario = {
  warenhaeuser: 130,
  sporthaeuser: 50,
  startCash: 120_000_000,
  kreditlinie: 90_000_000,
  firma: 'Hartwig & Brehm Warenhaus AG',
  sportName: 'Hartwig Sport',
  startJahr: 2027,
};

/** Kosten- und Strukturparameter, zentral für das Balancing. */
export const PARAM = {
  lohnVollzeit: 1_050, // € je FTE und Woche inkl. Nebenkosten
  lohnTeilzeit: 990,
  lohnAushilfe: 600,
  qmJeFte: 500,
  umsatzJeFte: 8_800,
  sonstigeQuote: 0.016,
  sonstigeQm: 0.45,
  logistikQuote: 0.025,
  nebenkostenQm: [1.0, 1.5] as [number, number],
  zentraleQuote: 0.034,
  marketingQuote: 0.025,
  zinsSatz: 0.08,
  konzessionsQuote: 0.22,
  kommissionsMarge: 0.25,
  bestandsReichweite: 11,
  kvLimitBasis: 380_000_000,
  abfindungRegulaer: 28_000,
  abfindungInsolvenz: 7_500,
};

function grossFuerCluster(h: RngHalter, c: Cluster, f: Format): number {
  if (f === 'sport') return Math.round(zwischen(h, 1500, 5500) / 50) * 50;
  if (c === 'metropole') return Math.round(zwischen(h, 14000, 28000) / 100) * 100;
  if (c === 'grossstadt') return Math.round(zwischen(h, 8000, 17000) / 100) * 100;
  return Math.round(zwischen(h, 5000, 9500) / 100) * 100;
}

function lageFuer(h: RngHalter, c: Cluster, f: Format): Lage {
  const r = zwischen(h, 0, 1);
  if (f === 'sport') return r < 0.55 ? '1a' : r < 0.85 ? 'center' : 'b';
  if (c === 'metropole') return r < 0.75 ? '1a' : 'center';
  if (c === 'grossstadt') return r < 0.6 ? '1a' : r < 0.85 ? 'b' : 'center';
  return r < 0.4 ? '1a' : r < 0.8 ? 'b' : r < 0.9 ? 'center' : 'rand';
}

function fit(g: GruppeId, kaufkraft: number, alter: number, wettbewerb: number): number {
  const d = GRUPPEN[g];
  return Math.pow(kaufkraft, d.kkElast) * Math.pow(alter, d.alterElast) * (1 - 0.25 * wettbewerb);
}

export const gruppenFit = fit;

function bauFlaechen(h: RngHalter, id: string, f: Format, vkQm: number, etagen: number[]): Flaeche[] {
  const gruppen = gruppenFuer(f);
  // Anteile leicht variieren
  const roh = gruppen.map((g) => GRUPPEN[g].anteilFlaeche * zwischen(h, 0.75, 1.25));
  const sum = roh.reduce((a, b) => a + b, 0);
  const qm = roh.map((x) => (x / sum) * vkQm);
  // Etagen von oben nach unten befüllen, Reihenfolge wie im Warenhaus typisch
  const reihenfolgeWH: GruppeId[] = ['food', 'beauty', 'accessoires', 'damen', 'waesche', 'herren', 'kinder', 'sport', 'spielwaren', 'wohnen'];
  const reihenfolgeSport: GruppeId[] = ['sportschuhe', 'sporttextil', 'outdoor', 'teamsport', 'rad', 'wintersport'];
  const reihenfolge = f === 'warenhaus' ? reihenfolgeWH : reihenfolgeSport;
  // EG zuerst, dann OGs, UG zuletzt (Food ins UG wenn vorhanden)
  const etagenOrdnung = [...etagen.filter((e) => e >= 0).sort((a, b) => a - b), ...etagen.filter((e) => e < 0)];
  const proEtage = vkQm / etagen.length;
  const fl: Flaeche[] = [];
  let etIdx = 0;
  let frei = proEtage;
  let n = 0;
  const reihe = [...reihenfolge];
  if (f === 'warenhaus' && etagen.includes(-1)) {
    // Food ins UG
    reihe.splice(reihe.indexOf('food'), 1);
  }
  const qmVon = (g: GruppeId) => qm[gruppen.indexOf(g)];
  const platziere = (g: GruppeId, menge: number, etage?: number) => {
    let rest = menge;
    if (etage !== undefined) {
      fl.push({ id: `${id}-f${++n}`, etage, qm: Math.round(rest), konzept: 'eigen', gruppe: g });
      return;
    }
    while (rest > 1 && etIdx < etagenOrdnung.length) {
      const e = etagenOrdnung[etIdx];
      if (f === 'warenhaus' && e === -1) { etIdx++; frei = proEtage; continue; }
      const nimm = Math.min(rest, frei);
      fl.push({ id: `${id}-f${++n}`, etage: e, qm: Math.round(nimm), konzept: 'eigen', gruppe: g });
      rest -= nimm;
      frei -= nimm;
      if (frei <= 1) { etIdx++; frei = proEtage; }
    }
    if (rest > 1) {
      const letzte = fl[fl.length - 1];
      letzte.qm += Math.round(rest);
    }
  };
  if (f === 'warenhaus' && etagen.includes(-1)) {
    const ug = proEtage;
    const food = qmVon('food');
    platziere('food', food, -1);
    if (ug - food > 200) platziere('wohnen', ug - food, -1);
  }
  for (const g of reihe) {
    let menge = qmVon(g);
    if (g === 'wohnen' && f === 'warenhaus' && etagen.includes(-1)) menge = Math.max(0, menge - (proEtage - qmVon('food')));
    if (menge > 1) platziere(g, menge);
  }
  return fl.filter((x) => x.qm > 0);
}

function name(h: RngHalter): string {
  return `${waehle(h, VORNAMEN)} ${waehle(h, NACHNAMEN)}`;
}

function bauHaus(h: RngHalter, idx: number, stadt: string, region: Region, cluster: Cluster, kk: number, f: Format, sz: Szenario, nr: number): Haus {
  const id = `${f === 'warenhaus' ? 'W' : 'S'}${String(idx).padStart(3, '0')}`;
  const lage = lageFuer(h, cluster, f);
  const vkQm = grossFuerCluster(h, cluster, f);
  // Etagenzahl nach Stadtgröße; die Grundfläche folgt daraus (Warenhäuser haben 3 bis 7 Ebenen)
  const nEtagen = f === 'sport' ? ganzZwischen(h, 1, 3)
    : cluster === 'metropole' ? ganzZwischen(h, 5, 7) : cluster === 'grossstadt' ? ganzZwischen(h, 4, 6) : ganzZwischen(h, 3, 5);
  const grundflaeche = Math.max(f === 'sport' ? 600 : 1500, Math.round(vkQm / nEtagen / 100) * 100);
  const hatUG = f === 'warenhaus' && nEtagen >= 3 && chance(h, 0.7);
  const etagen: number[] = [];
  if (hatUG) etagen.push(-1);
  for (let e = 0; etagen.length < nEtagen; e++) etagen.push(e);
  const einzug = {
    kaufkraft: clamp(kk * zwischen(h, 0.92, 1.08), 0.7, 1.4),
    alter: zwischen(h, 0.85, 1.2) * (cluster === 'mittelstadt' ? 1.05 : cluster === 'metropole' ? 0.95 : 1),
    wettbewerb: clamp(zwischen(h, 0, 1) * (lage === 'center' ? 1.2 : 1), 0, 1),
  };
  const flaechen = bauFlaechen(h, id, f, vkQm, etagen);
  const potenzial: Partial<Record<GruppeId, number>> = {};
  const saettigungQm: Partial<Record<GruppeId, number>> = {};
  let basisUmsatz = 0;
  for (const g of gruppenFuer(f)) {
    const qmG = flaechen.filter((x) => x.gruppe === g).reduce((a, b) => a + b.qm, 0);
    if (qmG <= 0) continue;
    const sQm = GRUPPEN[g].qmUmsatz * fit(g, einzug.kaufkraft, einzug.alter, einzug.wettbewerb) * LAGE_FAKTOR[lage] * CLUSTER_FAKTOR[cluster] * zwischen(h, 0.82, 1.15);
    const satF = zwischen(h, 0.45, 1.1); // < 1 = Fläche überdimensioniert
    const Q = qmG * satF;
    const sat = 1 - Math.exp(-qmG / Q);
    potenzial[g] = (sQm * qmG) / sat;
    saettigungQm[g] = Q;
    basisUmsatz += sQm * qmG;
  }
  // Miete: Quote am Umsatz, teils aus besseren Zeiten
  const vermieterEig = f === 'warenhaus' ? chance(h, 0.35) : chance(h, 0.1);
  const netTyp = vermieterEig ? (chance(h, 0.7) ? 'triple' : 'double') : (() => { const r = zwischen(h, 0, 1); return r < 0.3 ? 'net' : r < 0.8 ? 'double' : 'triple'; })();
  let mietQuote = zwischen(h, 0.065, 0.135);
  if (chance(h, 0.18)) mietQuote += zwischen(h, 0.04, 0.09); // Altverträge
  if (netTyp === 'net') mietQuote += 0.02;
  if (netTyp === 'triple') mietQuote -= 0.012;
  const fteBedarf = vkQm / PARAM.qmJeFte + basisUmsatz / PARAM.umsatzJeFte;
  const fteIst = fteBedarf * zwischen(h, 1.0, 1.22);
  const vz = fteIst * zwischen(h, 0.42, 0.58);
  const ah = fteIst * zwischen(h, 0.06, 0.14);
  const substanz = Math.round(zwischen(h, 30, 90));
  const zusatz = waehle(h, STANDORT_ZUSATZ[lage]);
  return {
    id,
    name: `${f === 'warenhaus' ? sz.firma.split(' ')[0] : sz.sportName} ${stadt}${nr > 1 ? ' ' + zusatz : lage === '1a' ? '' : ' ' + zusatz}`,
    stadt, region, cluster, lage, format: f, einzug, etagen,
    grundflaecheQm: grundflaeche,
    baujahr: (() => { const r = zwischen(h, 0, 1); return f === 'sport' ? ganzZwischen(h, 1975, 2015) : r < 0.2 ? ganzZwischen(h, 1895, 1930) : r < 0.32 ? ganzZwischen(h, 1931, 1954) : ganzZwischen(h, 1955, 2008); })(),
    fassade: ganzZwischen(h, 0, 7),
    flaechen,
    miete: {
      mieteWoche: eur((basisUmsatz * 52 * mietQuote) / 52),
      bisWoche: ganzZwischen(h, 26, 15 * 52),
      netTyp,
      vermieter: vermieterEig ? 'eigentuemer' : 'dritt',
      vermieterName: vermieterEig ? 'Brehm Immobilien GmbH & Co. KG' : waehle(h, VERMIETER),
      nebenkostenQmWoche: netTyp === 'net' ? 0 : zwischen(h, PARAM.nebenkostenQm[0], PARAM.nebenkostenQm[1]),
    },
    personal: {
      vollzeit: vz,
      teilzeit: fteIst - vz - ah,
      aushilfen: ah,
      filialleiter: { name: name(h), skill: zwischen(h, 0.3, 0.9), moral: zwischen(h, 45, 75) },
    },
    substanz,
    substanzStart: substanz,
    status: 'offen',
    potenzial,
    saettigungQm,
    transferBonus: 0,
  };
}

export function neueWelt(seed: number, sz: Szenario = STANDARD_SZENARIO): GameState {
  const h: RngHalter = { rng: seed >>> 0 };
  const haeuser: Haus[] = [];
  let wh = 0;
  let sp = 0;
  // Erst Mehrfachstandorte, dann einfache Städte, bis die Zielzahl erreicht ist
  for (const [stadt, region, cluster, kk, nWh, nSp] of STAEDTE) {
    for (let i = 1; i <= nWh && wh < sz.warenhaeuser; i++) {
      haeuser.push(bauHaus(h, ++wh, stadt, region, cluster, kk, 'warenhaus', sz, i));
    }
    for (let i = 1; i <= nSp && sp < sz.sporthaeuser; i++) {
      haeuser.push(bauHaus(h, ++sp, stadt, region, cluster, kk, 'sport', sz, i));
    }
  }
  // Auffüllen, falls die Städteliste nicht reicht
  let k = 0;
  while (wh < sz.warenhaeuser || sp < sz.sporthaeuser) {
    const [stadt, region, cluster, kk] = STAEDTE[k % STAEDTE.length];
    if (wh < sz.warenhaeuser) haeuser.push(bauHaus(h, ++wh, stadt, region, cluster, kk, 'warenhaus', sz, 2));
    else haeuser.push(bauHaus(h, ++sp, stadt, region, cluster, kk, 'sport', sz, 2));
    k++;
  }

  // Bestand: Reichweite in Wochen je Gruppe, mit Altersstruktur
  const bestand: Kohorte[] = [];
  const basisUmsatz: Partial<Record<GruppeId, number>> = {};
  for (const x of haeuser) {
    for (const [g, P] of Object.entries(x.potenzial) as [GruppeId, number][]) {
      const qmG = x.flaechen.filter((f) => f.gruppe === g).reduce((a, b) => a + b.qm, 0);
      const ist = P * (1 - Math.exp(-qmG / (x.saettigungQm[g] as number)));
      basisUmsatz[g] = (basisUmsatz[g] ?? 0) + ist;
    }
  }
  for (const [g, u] of Object.entries(basisUmsatz) as [GruppeId, number][]) {
    const d = GRUPPEN[g];
    const wochenEinsatz = u * (1 - d.marge);
    const gesamt = wochenEinsatz * PARAM.bestandsReichweite;
    // 6 Kohorten: frisch bis alt
    const verteilung = [0.24, 0.22, 0.2, 0.15, 0.11, 0.08];
    const alter = [1, 5, 9, 14, 20, 30];
    verteilung.forEach((v, i) => bestand.push({ gruppe: g, wert: eur(gesamt * v), alter: alter[i], saisonAnteil: d.saisonAnteil, kostenFaktor: 1 }));
  }

  const beraterQualitaet: Record<string, number> = {};
  for (const b of BERATER) for (const n of b.haeuser) beraterQualitaet[n] = zwischen(h, 0.2, 0.95);

  const umsatzWoche = Object.values(basisUmsatz).reduce((a, b) => a + (b ?? 0), 0);
  const zentrale = eur(umsatzWoche * PARAM.zentraleQuote);

  const s: GameState = {
    version: 1,
    seed,
    rng: h.rng,
    woche: 0,
    startJahr: sz.startJahr,
    firma: { name: sz.firma, sportName: sz.sportName },
    phase: 'regulaer',
    insolvenzenGesamt: 0,
    schwierigkeit: sz.schwierigkeit ?? 'mittel',
    cash: Math.round(sz.startCash * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].startCash),
    kreditlinie: Math.round(sz.kreditlinie * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].kreditlinie),
    kreditlinieBasis: Math.round(sz.kreditlinie * SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].kreditlinie),
    haeuser,
    bestand,
    bestellungen: [],
    verbindlichkeiten: [],
    orderLevel: Object.fromEntries(Object.keys(basisUmsatz).map((g) => [g, 1])),
    basisUmsatz,
    vorkasseAkzeptieren: true,
    lieferanten: LIEFERANTEN.map((l) => ({ ...l, geduld: clamp(l.geduld + SCHWIERIGKEIT[sz.schwierigkeit ?? 'mittel'].lieferantenGeduld, 0, 1), gruppen: { ...l.gruppen }, aktiv: true, verspaetungen: 0 })),
    restLieferantenVertrauen: 55,
    stakeholder: { bank: 50, kreditversicherer: 58, vermieter: 50, betriebsrat: 50, image: 45, eigentuemer: 50 },
    kvLimitBasis: PARAM.kvLimitBasis,
    tarif: 'flaeche',
    zentrale: { kostenWoche: zentrale, kostenStart: zentrale, fte: Math.round(zentrale / 1500) },
    marketing: { budgetQuote: PARAM.marketingQuote, gewoehnung: 0.15, kundenkarte: false, aktionen: [], stand: undefined as unknown as GameState['marketing']['stand'] },
    controllingStufe: 1,
    berater: [],
    beraterQualitaet,
    angebote: [],
    entscheidungen: [],
    entscheidungsprotokoll: [],
    quartale: [],
    eigentuemer: { strikes: 0, kapitalZugefuehrt: 0 },
    makro: { konjunktur: 1, schockStaerke: 0, phase: zwischen(h, 0, Math.PI * 2) },
    meldungen: [],
    historie: [],
    zaehler: 0,
    einmalkostenWoche: 0,
    einmalErloeseWoche: 0,
    hq: undefined as unknown as GameState['hq'],
    einkauf: undefined as unknown as GameState['einkauf'],
    eigenmarken: erzeugeEigenmarken(),
    vorstand: undefined as unknown as GameState['vorstand'],
    produkte: undefined as unknown as GameState['produkte'],
  };
  // Hauptverwaltung: alte, zu große Zentrale in Essen, kalibriert auf die bisherige Zentralkostenquote
  s.hq = erzeugeHq(s, zentrale);
  // Vorstand: Gehälter sind Teil der bisherigen Zentralkosten (Sachkosten je FTE entsprechend niedriger)
  s.vorstand = erzeugeVorstand(s);
  s.hq.sachJeFte -= vorstandKostenWoche(s) / s.hq.abteilungen.reduce((a, x) => a + x.fte, 0);
  hqAktualisiere(s);
  s.zentrale.fte = Math.round(s.hq.abteilungen.reduce((a, x) => a + x.fte, 0));
  neueHqAngebote(s);
  initialeVerbindlichkeiten(s);
  // Einkauf: Warengruppen, Eigenmarken, Bestand und Pipeline je WG (ersetzt die Bereichskohorten)
  s.einkauf = erzeugeEinkauf(s);
  initialisiereEinkauf(s);
  // Produktentwicklung: Startsortiment der Eigenmarken (Basis für Nachfrage und Marge)
  s.produkte = erzeugeProdukte(s);
  // Marketing: Kanäle, Hartwig Karte und App, CRM, Startkalender (Standardplan = Ausgangslage)
  s.marketing.stand = erzeugeMarketing(s);
  initialisiereMarketing(s);
  return s;
}

/** Offene Warenverbindlichkeiten und Pipeline zum Start (eingeschwungener Zustand). */
function initialeVerbindlichkeiten(s: GameState): void {
  for (const [g, u] of Object.entries(s.basisUmsatz) as [GruppeId, number][]) {
    const d = GRUPPEN[g];
    const wochenEinsatz = u * (1 - d.marge);
    for (let w = 1; w <= 8; w++) {
      s.verbindlichkeiten.push({ id: `v0-${g}-${w}`, art: 'ware', gruppe: g, wert: eur(wochenEinsatz), faellig: w - 1 });
    }
    for (let w = 0; w < d.vorlauf; w++) {
      s.bestellungen.push({ id: `b0-${g}-${w}`, gruppe: g, wert: eur(wochenEinsatz), ankunft: w, vorkasse: false });
    }
  }
}

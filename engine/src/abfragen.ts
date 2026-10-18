import { GRUPPEN } from './daten';
import { runwayWochen } from './stakeholder';
import type { GameState, Haus } from './types';
import { eur, jahr, kw } from './util';
import { bestandWert, kvLimit, offeneWarenverbindlichkeiten } from './ware';

export interface Cockpit {
  kw: number;
  jahr: number;
  phase: GameState['phase'];
  cash: number;
  kreditFrei: number;
  runwayWochen: number;
  ebitdaWoche: number;
  ebitda13: number;
  umsatzWoche: number;
  vertrauen: number; // Mittel aus Bank, Kreditversicherer, Lieferanten
  image: number;
  offeneEntscheidungen: number;
  offeneAngebote: number;
}

export function cockpit(s: GameState): Cockpit {
  const letzte = s.historie[s.historie.length - 1];
  const h13 = s.historie.slice(-13);
  const lief = s.lieferanten.filter((l) => l.aktiv);
  const lv = (lief.reduce((a, l) => a + l.vertrauen, 0) + s.restLieferantenVertrauen) / (lief.length + 1);
  return {
    kw: kw(s.woche),
    jahr: jahr(s),
    phase: s.phase,
    cash: s.cash,
    kreditFrei: s.cash + s.kreditlinie,
    runwayWochen: Math.round(runwayWochen(s)),
    ebitdaWoche: letzte?.ebitda ?? 0,
    ebitda13: h13.reduce((a, b) => a + b.ebitda, 0),
    umsatzWoche: letzte?.umsatz ?? 0,
    vertrauen: Math.round((s.stakeholder.bank + s.stakeholder.kreditversicherer + lv) / 3),
    image: Math.round(s.stakeholder.image),
    offeneEntscheidungen: s.entscheidungen.length,
    offeneAngebote: s.angebote.filter((a) => a.status === 'offen').length,
  };
}

export interface PortfolioZeile {
  id: string;
  name: string;
  format: Haus['format'];
  region: Haus['region'];
  cluster: Haus['cluster'];
  lage: Haus['lage'];
  status: Haus['status'];
  qm: number;
  umsatz: number;
  db: number;
  mietquote: number;
  personalquote: number;
  flaechenproduktivitaet: number; // €/qm/Woche
}

/** Hauskennzahlen, wie das Controlling sie liefert: je schwächer die Besetzung, desto mehr Rauschen. */
export function portfolio(s: GameState): PortfolioZeile[] {
  const rausch = [0.12, 0.04, 0][s.controllingStufe];
  return s.haeuser
    .filter((h) => h.status !== 'verkauft')
    .map((h) => {
      const k = h.kpi;
      const qm = h.flaechen.reduce((a, f) => a + f.qm, 0);
      // deterministisches Rauschen je Haus und Woche
      const seed = (h.id.charCodeAt(1) * 31 + h.id.charCodeAt(3) * 17 + s.woche * 7) % 100;
      const f = 1 + rausch * ((seed / 100) * 2 - 1);
      const umsatz = k?.umsatz ?? 0;
      const db = k ? k.db + Math.abs(umsatz) * (f - 1) * 0.5 : 0;
      return {
        id: h.id, name: h.name, format: h.format, region: h.region, cluster: h.cluster, lage: h.lage, status: h.status, qm,
        umsatz: eur(umsatz), db: eur(db),
        mietquote: umsatz > 0 ? (k?.miete ?? 0) / umsatz : 0,
        personalquote: umsatz > 0 ? (k?.personal ?? 0) / umsatz : 0,
        flaechenproduktivitaet: qm > 0 ? umsatz / qm : 0,
      };
    });
}

export function hausDetail(s: GameState, id: string) {
  const h = s.haeuser.find((x) => x.id === id);
  if (!h) return undefined;
  const etagen = h.etagen.map((e) => ({
    etage: e,
    flaechen: h.flaechen.filter((f) => f.etage === e).map((f) => ({
      id: f.id, qm: f.qm, konzept: f.konzept, gruppe: f.gruppe ? GRUPPEN[f.gruppe].name : undefined,
      mieter: f.mieter?.name, umbauBis: f.umbauBis,
      umsatzQm: f.gruppe && h.kpi?.umsatzJeGruppe[f.gruppe] ? (h.kpi.umsatzJeGruppe[f.gruppe] ?? 0) / Math.max(1, h.flaechen.filter((x) => x.gruppe === f.gruppe).reduce((a, b) => a + b.qm, 0)) : 0,
    })),
  }));
  return { haus: h, etagen };
}

export function warenwirtschaft(s: GameState) {
  return Object.keys(s.basisUmsatz).map((g) => ({
    gruppe: g,
    name: GRUPPEN[g as keyof typeof GRUPPEN].name,
    bestand: eur(bestandWert(s, g as keyof typeof GRUPPEN)),
    orderLevel: s.orderLevel[g as keyof typeof GRUPPEN] ?? 1,
  })).concat([]).map((x) => x);
}

export function kreditversicherung(s: GameState) {
  return { limit: eur(kvLimit(s)), genutzt: eur(offeneWarenverbindlichkeiten(s)) };
}

/** Hauptverwaltung: Gebäude, Etagen mit Belegung und Auslastung, Abteilungen mit Stufe, FTE, Kosten und Wirkung, offene Angebote. */
export { hqUebersicht, hqFuerGrafik } from './hq';

/** Einkauf: Übersicht nach Bereich und WG, WG-Detail, Freigabe-Eingang. */
export { einkaufUebersicht, wgDetail, freigaben } from './einkauf';
/** Eigenmarken: Markenkarten, Shop-Anteile je Bereich, Vorschau für den Gründungsassistenten. */
export { eigenmarkenUebersicht, eigenmarkeVorschau } from './eigenmarken';

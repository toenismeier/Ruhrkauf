import { GRUPPEN, saisonFaktor, TREND_LAGE } from './daten';
import type { Aktion, GameState, GruppeId, Haus, HausKpi } from './types';
import { clamp, eur, normal } from './util';
import { PARAM } from './welt';
import { premiumImageFaktor, premiumServiceQuote } from './premium';
import { hqBesetzungsNorm, hqLogistikFaktor, hqMarketingFaktor, hqUmsatzFaktor } from './hq';
import { marketingGruppen, marketingHausFaktor, type AktionsMessung } from './marketing';
import { wettbewerbNachfrageFaktor, wettbewerbFrequenzFaktor, wettbewerbOffpriceFaktor } from './wettbewerb';
// O07 Haus
import { hausBetriebsFaktor, hausBetriebskosten } from './haus';

/** Rohergebnis eines Hauses vor der Bestandsprüfung. */
export interface HausRoh {
  haus: Haus;
  // eigene Ware: Bruttoabsatz zu Normalpreis und Umsatz nach Rabatt
  eigen: Partial<Record<GruppeId, { brutto: number; umsatz: number }>>;
  kommission: Partial<Record<GruppeId, number>>; // Umsatz
  offprice: number;
  konzessionUmsatz: number;
  untermiete: number;
  fteBedarf: number;
  aktion?: Aktion;
  ohneAktion: number; // Umsatz ohne Aktion (für Messung)
  ohneAktionRohertrag: number;
  /** Messdatensätze der laufenden Aktionen (src/marketing.ts). */
  aktionsMessung?: AktionsMessung[];
}

export function istAktiv(h: Haus): boolean {
  return h.status === 'offen' || h.status === 'schliessung_verhandlung' || h.status === 'raeumung';
}

export function aktiveFlaeche(h: Haus, w: number) {
  return h.flaechen.filter((f) => f.umbauBis === undefined || f.umbauBis <= w);
}

/** Echter Mengeneffekt einer Rabattaktion. */
export function aktionsUplift(s: GameState, h: Haus, rabatt: number): number {
  const basis = 0.9 * Math.pow(rabatt, 0.9);
  const kk = Math.sqrt(clamp(2 - h.einzug.kaufkraft, 0.5, 1.5));
  const karte = s.marketing.kundenkarte ? 0.85 : 1;
  return basis * (1 - s.marketing.gewoehnung) * kk * karte;
}

function lieferantenFaktor(s: GameState, h: Haus, g: GruppeId): number {
  let f = 1;
  for (const l of s.lieferanten) {
    const anteil = l.gruppen[g];
    if (!anteil) continue;
    if (l.ausfallBis !== undefined && l.ausfallBis > s.woche) f *= 1 - anteil * 0.8;
    if (!l.aktiv) continue;
    if (l.rueckzug && h.lage !== '1a') f *= 1 - anteil * 0.6;
    if (l.dtc) f *= 1 - anteil * 0.18;
  }
  return f;
}

export function hausFaktor(s: GameState, h: Haus): number {
  const w = s.woche;
  const makro = s.makro.konjunktur * Math.pow(1 - TREND_LAGE[h.lage], w / 52);
  const image = (0.9 + 0.002 * s.stakeholder.image) / (0.9 + 0.002 * 45);
  // Kanäle, Markenstärke und Marketingabteilung der Zentrale (src/marketing.ts, Ausgangslage = 1)
  const mkt = marketingHausFaktor(s, h);
  const substanz = (0.85 + 0.0015 * h.substanz) / (0.85 + 0.0015 * h.substanzStart);
  let mieterBonus = 0;
  let umbau = false;
  for (const f of h.flaechen) {
    if (f.umbauBis !== undefined && f.umbauBis > w) umbau = true;
    else if (f.konzept === 'untermiete' && f.mieter) mieterBonus += f.mieter.frequenzBonus;
  }
  const fl = h.personal.filialleiter;
  const skill = fl.interimBis !== undefined && fl.interimBis > w ? 0.3 : fl.skill;
  const flF = (0.95 + 0.1 * skill) / 1.05;
  let status = 1;
  if (h.status === 'schliessung_verhandlung') status = 0.95;
  if (h.status === 'raeumung') status = 1.7;
  const streik = h.streikBis !== undefined && h.streikBis > w ? 0.72 : 1;
  const rauschen = s.prognose ? 1 : 1 + 0.025 * normal(s);
  // Zentrale: E-Commerce (Umsatzbonus) und Visual Merchandising (Flächenproduktivität) aus der Hauptverwaltung
  const zentrale = hqUmsatzFaktor(s);
  return makro * image * mkt * substanz * wettbewerbFrequenzFaktor(s, h) * (1 + mieterBonus) * (1 + h.transferBonus) * flF * status * streik * (umbau ? 0.97 : 1) * rauschen * zentrale * premiumImageFaktor(h) * hausBetriebsFaktor(s, h);
}

export function saettigung(qm: number, Q: number): number {
  return Q > 0 ? 1 - Math.exp(-qm / Q) : 0;
}

export function simuliereHaus(s: GameState, h: Haus): HausRoh {
  const w = s.woche;
  const roh: HausRoh = { haus: h, eigen: {}, kommission: {}, offprice: 0, konzessionUmsatz: 0, untermiete: 0, fteBedarf: 0, ohneAktion: 0, ohneAktionRohertrag: 0 };
  if (!istAktiv(h)) return roh;
  const hf = hausFaktor(s, h);
  const fl = aktiveFlaeche(h, w);
  const raeumung = h.status === 'raeumung';

  const qmEigen: Partial<Record<GruppeId, number>> = {};
  const qmKomm: Partial<Record<GruppeId, number>> = {};
  const qmKonz: Partial<Record<GruppeId, number>> = {};
  let qmOff = 0;
  let qmVerkauf = 0;
  for (const f of fl) {
    if (f.konzept === 'eigen' && f.gruppe) { qmEigen[f.gruppe] = (qmEigen[f.gruppe] ?? 0) + f.qm; qmVerkauf += f.qm; }
    else if (f.konzept === 'kommission' && f.gruppe) { qmKomm[f.gruppe] = (qmKomm[f.gruppe] ?? 0) + f.qm; qmVerkauf += f.qm; }
    else if (f.konzept === 'konzession' && f.gruppe) qmKonz[f.gruppe] = (qmKonz[f.gruppe] ?? 0) + f.qm;
    else if (f.konzept === 'offprice') { qmOff += f.qm; qmVerkauf += f.qm; }
    else if (f.konzept === 'untermiete' && f.mieter) roh.untermiete += f.mieter.mieteWoche;
  }

  const normalpreis = 1 - 0.25 * s.marketing.gewoehnung;
  const bruttoBasis: Partial<Record<GruppeId, number>> = {};
  let summeBasis = 0;
  let summeBedarf = 0; // Personalbedarf wächst in der Saison unterproportional
  const alleGruppen = new Set<GruppeId>([...Object.keys(qmEigen), ...Object.keys(qmKomm)] as GruppeId[]);
  for (const g of alleGruppen) {
    const P = h.potenzial[g] ?? 0;
    const Q = h.saettigungQm[g] ?? 1;
    const qm = (qmEigen[g] ?? 0) + (qmKomm[g] ?? 0);
    const sf = saisonFaktor(g, w);
    const b = P * saettigung(qm, Q) * sf * hf * normalpreis * lieferantenFaktor(s, h, g) * wettbewerbNachfrageFaktor(s, h, g);
    bruttoBasis[g] = b;
    summeBasis += b;
    summeBedarf += (b / Math.max(0.05, sf)) * Math.sqrt(sf);
  }
  const offBasis = qmOff * 20 * (1.6 - 0.6 * h.einzug.kaufkraft) * hf * saisonFaktor('damen', w) * wettbewerbOffpriceFaktor(s, h);
  summeBasis += offBasis;
  summeBedarf += offBasis;

  // Personal
  const p = h.personal;
  const fteIst = p.vollzeit + p.teilzeit + p.aushilfen;
  roh.fteBedarf = (qmVerkauf / PARAM.qmJeFte) * (h.klasse === 'premium' ? 1.15 : 1) + summeBedarf / PARAM.umsatzJeFte;
  // Besetzungsnorm: eine gute Personalabteilung plant Einsätze effizienter
  const besetzung = roh.fteBedarf > 0 ? Math.pow(clamp(fteIst / roh.fteBedarf / hqBesetzungsNorm(s), 0, 1), 0.5) : 1;
  const ahQuote = fteIst > 0 ? p.aushilfen / fteIst : 0;

  // Aktionskalender, Hartwig Karte und CRM je Gruppe (src/marketing.ts); Räumung wie bisher 35 % auf alles
  const basisJe: Partial<Record<GruppeId, number>> = {};
  const tEJe: Partial<Record<GruppeId, number>> = {};
  for (const g of alleGruppen) {
    const d = GRUPPEN[g];
    const qualitaet = besetzung * (1 - d.beratung * Math.max(0, ahQuote - 0.15) * 0.6);
    basisJe[g] = (bruttoBasis[g] ?? 0) * qualitaet;
    const qe = qmEigen[g] ?? 0;
    const qk = qmKomm[g] ?? 0;
    tEJe[g] = qe + qk > 0 ? qe / (qe + qk) : 0;
  }
  const mess: AktionsMessung[] = [];
  const mw = raeumung ? undefined : marketingGruppen(s, h, basisJe, tEJe, mess);
  if (mess.length) roh.aktionsMessung = mess;
  for (const g of alleGruppen) {
    const basis = basisJe[g] ?? 0;
    const e = mw?.[g];
    const brutto = basis * (e ? e.nachfrage : 1);
    const umsatz = raeumung ? brutto * (1 - 0.35) : brutto * (e ? e.preis : 1);
    const qe = qmEigen[g] ?? 0;
    const qk = qmKomm[g] ?? 0;
    const tE = tEJe[g] ?? 0;
    if (qe > 0) roh.eigen[g] = { brutto: brutto * tE, umsatz: umsatz * tE };
    if (qk > 0) roh.kommission[g] = umsatz * (1 - tE);
  }
  roh.offprice = offBasis * besetzung;

  for (const [g, qm] of Object.entries(qmKonz) as [GruppeId, number][]) {
    const P = h.potenzial[g] ?? 0;
    const Q = h.saettigungQm[g] ?? 1;
    roh.konzessionUmsatz += P * saettigung(qm, Q) * saisonFaktor(g, w) * hf * lieferantenFaktor(s, h, g) * wettbewerbNachfrageFaktor(s, h, g);
  }
  return roh;
}

export interface HausKosten {
  personal: number;
  miete: number;
  nebenkosten: number;
  sonstige: number;
  logistik: number;
  personalCash: number;
}

export function lohnKosten(s: GameState, h: Haus): number {
  const p = h.personal;
  const tarifF = s.tarif === 'sanierung' ? 0.93 : s.tarif === 'ohne' ? 0.89 : 1;
  return (p.vollzeit * PARAM.lohnVollzeit + p.teilzeit * PARAM.lohnTeilzeit) * tarifF + p.aushilfen * PARAM.lohnAushilfe;
}

export function hausKosten(s: GameState, h: Haus, umsatzEigen: number, umsatzGesamt: number): HausKosten {
  const k: HausKosten = { personal: 0, miete: 0, nebenkosten: 0, sonstige: 0, logistik: 0, personalCash: 0 };
  if (h.status === 'verkauft') return k;
  if (h.status === 'geschlossen') {
    if (h.restmieteBis !== undefined && h.restmieteBis > s.woche) k.miete = h.restmieteWoche ?? 0;
    return k;
  }
  k.personal = lohnKosten(s, h);
  k.miete = h.miete.mieteWoche;
  let qmNk = 0;
  let qmBetrieb = 0;
  for (const f of h.flaechen) {
    if (f.konzept === 'untermiete') continue;
    qmNk += f.qm;
    qmBetrieb += f.konzept === 'leer' ? f.qm * 0.25 : f.qm;
  }
  k.nebenkosten = h.miete.netTyp === 'net' ? 0 : qmNk * h.miete.nebenkostenQmWoche;
  // O07 Haus: identische Kosten im neutralen Standard, Aufteilung in fünf Posten.
  k.sonstige = hausBetriebskosten(s, h, PARAM.sonstigeQuote * umsatzGesamt + PARAM.sonstigeQm * qmBetrieb + premiumServiceQuote(h) * umsatzGesamt);
  k.logistik = PARAM.logistikQuote * umsatzEigen * hqLogistikFaktor(s);
  return k;
}

export function leereKpi(w: number): HausKpi {
  return { woche: w, umsatz: 0, rohertrag: 0, konzessionserloes: 0, untermiete: 0, personal: 0, miete: 0, nebenkosten: 0, sonstige: 0, db: 0, fteBedarf: 0, fteIst: 0, umsatzJeGruppe: {} };
}

export function rundeKpi(k: HausKpi): HausKpi {
  const r = { ...k };
  for (const key of ['umsatz', 'rohertrag', 'konzessionserloes', 'untermiete', 'personal', 'miete', 'nebenkosten', 'sonstige', 'db'] as const) r[key] = eur(r[key]);
  r.umsatzJeGruppe = Object.fromEntries(Object.entries(k.umsatzJeGruppe).map(([g, v]) => [g, eur(v ?? 0)]));
  return r;
}

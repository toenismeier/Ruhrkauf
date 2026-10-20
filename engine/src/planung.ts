// O06 Planung – Jahresbudget, Gegenstromverfahren, Quartalsforecast und Boni.
// Alle Werte in Euro. Keine Zufallsziehungen: die Berechnung verändert den Engine-RNG nicht.
import { GRUPPEN, saisonFaktor } from './daten';
import type { Entscheidung, Format, GameState, GruppeId, Haus, Region, WochenKpi } from './types';
import { clamp, eur, jahr, kw, melde, neueId } from './util';

export type PlanEbene = 'konzern' | 'format' | 'region' | 'hauscluster' | 'haus' | 'warengruppe';
export interface PlanZiele { umsatz: number; ebitda: number; investitionen: number }
export interface PlanKnoten {
  id: string; name: string; ebene: PlanEbene; parent?: string;
  basis: number; umsatz: number; rueckmeldung: number; verdacht: boolean;
  ist: number; kinder: string[];
}
export interface Jahresplan {
  jahr: number; ziele: PlanZiele; quelle: 'vorgaenger' | 'controlling' | 'spieler';
  knoten: Record<string, PlanKnoten>;
  phasing: Record<string, number[]>; // Häuser × 52 Wochen: Summe genau Jahresziel
  warengruppen: Partial<Record<GruppeId, number>>;
  istUmsatz: number; istEbitda: number;
  istHaus: Record<string, { umsatz: number; db: number }>;
  geschlossen: boolean;
}
export interface PlanEntwurf {
  jahr: number; ziele: PlanZiele; overrides: Record<string, number>;
  stand: 'offen' | 'abgeschlossen';
}
export interface Quartalsforecast {
  jahr: number; quartal: 1 | 2 | 3; bezeichnung: '3+9' | '6+6' | '9+3';
  woche: number; ziele: PlanZiele; wochenUmsatz: number[];
  status: 'offen' | 'abgegeben' | 'zurueckgehalten';
  korrigiert: boolean;
}
export interface PlanBonus { jahr: number; faellig: number; betrag: number; bezahlt: boolean; details: { id: string; ebene: string; betrag: number }[] }
export interface PlanungStand {
  jahre: Jahresplan[]; entwurf?: PlanEntwurf; forecasts: Quartalsforecast[];
  bonusAnteil: { haus: number; hauscluster: number; bereich: number };
  boni: PlanBonus[]; vertrauenVerlauf: { woche: number; delta: number; abweichung: number }[];
}

const aktiv = (h: Haus) => h.status !== 'geschlossen' && h.status !== 'verkauft';
const clusterVon = (h: Haus): string => (h as Haus & { hauscluster?: string }).hauscluster || h.region;
const keys = (h: Haus): string[] => ['konzern', 'format:' + h.format, 'region:' + h.format + ':' + h.region,
  'hauscluster:' + h.format + ':' + h.region + ':' + clusterVon(h), 'haus:' + h.id];
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const stable = (id: string) => [...id].reduce((x, c) => (Math.imul(x, 31) + c.charCodeAt(0)) >>> 0, 13) / 4294967295;
const basisHaus = (h: Haus): number => Math.max(1, sum(Object.values(h.potenzial).map((n) => n ?? 0)));
const vorjahr = (s: GameState, zielJahr: number) => s.historie.filter((k) => jahr(s, k.woche) === zielJahr - 1);
const anteil = (n: number, d: number) => d ? n / d : 0;

function jahresVorschlag(s: GameState, zielJahr: number): PlanZiele {
  const vj = vorjahr(s, zielJahr);
  const verkauf = vj.length >= 13 ? sum(vj.map((k) => k.umsatz)) / vj.length * 52
    : sum(Object.values(s.basisUmsatz).map((n) => n ?? 0)) * 52;
  const ebitda = vj.length >= 13 ? sum(vj.map((k) => k.ebitda)) / vj.length * 52 : -2_200_000 * 52;
  const trend = vj.length >= 26 ? clamp((sum(vj.slice(-13).map((k) => k.umsatz)) / 13) / Math.max(1, sum(vj.slice(0, 13).map((k) => k.umsatz)) / 13) - 1, -0.08, 0.08) : 0;
  return { umsatz: eur(Math.max(0, verkauf * (1 + trend))), ebitda: eur(ebitda + verkauf * trend * 0.25),
    investitionen: eur(Math.max(0, verkauf * 0.015)) };
}

function startZiele(s: GameState): PlanZiele {
  const basis = jahresVorschlag(s, s.startJahr);
  return { ...basis, umsatz: eur(basis.umsatz * 1.03), ebitda: eur(basis.ebitda + basis.umsatz * 0.03 * 0.25) };
}

// Kinder erhalten ein deterministisches Rundungsresiduum; ein explizites Ziel bleibt dabei fix,
// sofern genügend Volumen für die anderen Kinder bleibt.
function verteileBetrag(total: number, kinder: string[], gewicht: Record<string, number>, fix: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  const feste = kinder.filter((k) => fix[k] !== undefined);
  const frei = kinder.filter((k) => fix[k] === undefined);
  const festSum = sum(feste.map((k) => Math.max(0, fix[k])));
  const faktor = festSum > total && festSum > 0 ? total / festSum : 1;
  for (const k of feste) out[k] = eur(Math.max(0, fix[k]) * faktor);
  const rest = Math.max(0, total - sum(Object.values(out)));
  const gewichtSum = sum(frei.map((k) => Math.max(0, gewicht[k] ?? 0)));
  let verteilt = 0;
  for (let i = 0; i < frei.length; i++) {
    const k = frei[i];
    const wert = i === frei.length - 1 ? rest - verteilt
      : eur(rest * (gewichtSum > 0 ? Math.max(0, gewicht[k] ?? 0) / gewichtSum : 1 / frei.length));
    out[k] = wert; verteilt += wert;
  }
  // Rundungsdifferenz bei ausschließlich fixierten Kindern wird auf letztes Kind gebucht.
  if (!frei.length && kinder.length) out[kinder[kinder.length - 1]] += total - sum(Object.values(out));
  return out;
}

function machKnoten(s: GameState, ziele: PlanZiele, overrides: Record<string, number> = {}): Record<string, PlanKnoten> {
  const knoten: Record<string, PlanKnoten> = {
    konzern: { id: 'konzern', name: 'Hartwig Konzern', ebene: 'konzern', basis: 0, umsatz: ziele.umsatz, rueckmeldung: ziele.umsatz, verdacht: false, ist: 0, kinder: [] },
  };
  const hs = s.haeuser.filter(aktiv);
  for (const h of hs) {
    const ids = keys(h);
    const names = ['Hartwig Konzern', h.format === 'sport' ? 'Hartwig Sport' : 'Hartwig', h.region, clusterVon(h), h.name];
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], parent = i ? ids[i - 1] : undefined;
      if (!knoten[id]) knoten[id] = { id, name: names[i], ebene: (['konzern', 'format', 'region', 'hauscluster', 'haus'] as PlanEbene[])[i], parent,
        basis: 0, umsatz: 0, rueckmeldung: 0, verdacht: false, ist: 0, kinder: [] };
      knoten[id].basis += basisHaus(h);
      if (parent && !knoten[parent].kinder.includes(id)) knoten[parent].kinder.push(id);
    }
  }
  function walk(id: string): void {
    const n = knoten[id]; if (!n.kinder.length) return;
    const wg = Object.fromEntries(n.kinder.map((k) => [k, knoten[k].basis]));
    const v = verteileBetrag(n.umsatz, n.kinder, wg, overrides);
    for (const k of n.kinder) { knoten[k].umsatz = v[k]; walk(k); }
  }
  walk('konzern');
  // Sandbagging und Optimismus sind deterministische Leitungsmerkmale; besseres Controlling
  // erkennt einen höheren Anteil davon und markiert ihn explizit.
  const qualitaet = clamp(0.35 + 0.25 * s.controllingStufe, 0, 1);
  for (const n of Object.values(knoten)) {
    if (n.ebene !== 'hauscluster' && n.ebene !== 'haus') { n.rueckmeldung = n.umsatz; continue; }
    const ro = stable(n.id);
    const abweichung = ro < 0.72 ? -(0.015 + 0.065 * ro) : 0.01 + 0.045 * ro;
    n.rueckmeldung = eur(n.umsatz * (1 + abweichung));
    n.verdacht = abweichung < -0.035 && qualitaet > 0.45 + stable('pruefung:' + n.id) * 0.35;
    if (n.verdacht) n.rueckmeldung = eur(n.rueckmeldung + qualitaet * (n.umsatz - n.rueckmeldung) * 0.75);
  }
  return knoten;
}

function ostern(j: number): number {
  const a = j % 19, b = Math.floor(j / 100), c = j % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k + 700) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monat = Math.floor((h + l - 7 * m + 114) / 31);
  const tag = ((h + l - 7 * m + 114) % 31) + 1;
  return Math.floor((Date.UTC(j, monat - 1, tag) - Date.UTC(j, 0, 1)) / 86400000 / 7);
}
function planWochen(s: GameState, planJahr: number, h: Haus, ziel: number): number[] {
  const e = ostern(planJahr);
  const roh: number[] = Array.from({ length: 52 }, (_, w) => {
    let f = 0;
    let sgew = 0;
    for (const [g, umsatz] of Object.entries(h.potenzial) as [GruppeId, number][]) {
      f += umsatz * saisonFaktor(g, w); sgew += umsatz;
    }
    let kal = 1;
    // Osterverschiebung, Feiertagsdichte und veränderte Samstagszahl.
    if (Math.abs(w - e) <= 1) kal *= w === e ? 0.94 : 1.04;
    if (w === 0 || w === 51 || w === 17 || w === 39) kal *= 0.96;
    if ((w + planJahr) % 13 === 0) kal *= 1.025;
    const globalW = (planJahr - s.startJahr) * 52 + w;
    for (const a of s.marketing.aktionen) if (a.status !== 'abgesagt' && a.start <= globalW && globalW < a.ende) {
      if (a.scope.typ === 'alle' || a.scope.typ === 'format' && a.scope.format === h.format ||
          a.scope.typ === 'region' && a.scope.region === h.region ||
          a.scope.typ === 'haeuser' && a.scope.ids.includes(h.id) ||
          a.scope.typ === 'cluster' && a.scope.cluster === h.cluster) kal *= 1 + Math.min(0.12, a.rabatt * 0.25);
    }
    return Math.max(0.05, (sgew ? f / sgew : 1) * kal);
  });
  const summe = sum(roh);
  let vergeben = 0;
  return roh.map((x, i) => { const v = i === 51 ? ziel - vergeben : eur(ziel * x / summe); vergeben += v; return v; });
}

function erstelleJahresplan(s: GameState, j: number, ziele: PlanZiele, override: Record<string, number>, quelle: Jahresplan['quelle']): Jahresplan {
  const knoten = machKnoten(s, ziele, override);
  const phasing: Record<string, number[]> = {};
  for (const h of s.haeuser.filter(aktiv)) phasing[h.id] = planWochen(s, j, h, knoten['haus:' + h.id]?.umsatz ?? 0);
  const wg: Partial<Record<GruppeId, number>> = {};
  for (const h of s.haeuser.filter(aktiv)) {
    const betrag = knoten['haus:' + h.id]?.umsatz ?? 0;
    const basis = basisHaus(h);
    for (const [g, b] of Object.entries(h.potenzial) as [GruppeId, number][]) wg[g] = (wg[g] ?? 0) + eur(betrag * b / basis);
  }
  return { jahr: j, ziele: { ...ziele }, quelle, knoten, phasing, warengruppen: wg,
    istUmsatz: 0, istEbitda: 0, istHaus: {}, geschlossen: false };
}

export function initialisierePlanung(s: GameState): void {
  s.planung = { jahre: [erstelleJahresplan(s, s.startJahr, startZiele(s), {}, 'vorgaenger')],
    forecasts: [], boni: [], bonusAnteil: { haus: 0.10, hauscluster: 0.10, bereich: 0.10 }, vertrauenVerlauf: [] };
}
export function planJahr(s: GameState, j = jahr(s)): Jahresplan | undefined { return s.planung?.jahre.find((x) => x.jahr === j); }
export function planWoche(s: GameState, hausId: string, woche = s.woche): number {
  const plan = planJahr(s, jahr(s, woche));
  return plan?.phasing[hausId]?.[woche % 52] ?? 0;
}
export function planBudgetFaktor(s: GameState, ebene: 'ware' | 'personal', id: string): number {
  // O04/O05 koppeln hieran ihre Budgets. Basis ist der ursprüngliche Controlling-Vorschlag,
  // so bleibt der Ausgangsplan strikt neutral.
  const p = planJahr(s); if (!p) return 1;
  const ziel = ebene === 'ware' ? p.warengruppen[id as GruppeId] : p.knoten[id]?.umsatz;
  if (ziel === undefined) return 1;
  const start = p.quelle === 'vorgaenger' ? ziel : p.knoten[id]?.basis;
  return clamp(anteil(ziel, Math.max(1, start ?? ziel)), 0.5, 1.5);
}
export function planungAktion(s: GameState, a: PlanungAktion): string | null {
  const p = s.planung; if (!p) return 'Planung nicht verfügbar.';
  if (a.typ === 'planungBonus') {
    if (!(a.anteil >= 0 && a.anteil <= 0.5)) return 'Bonusanteil muss zwischen 0 und 50 % liegen.';
    p.bonusAnteil[a.ebene] = a.anteil; return null;
  }
  if (a.typ === 'planungForecast') {
    const f = p.forecasts.find((x) => x.status === 'offen' && x.jahr === jahr(s));
    if (!f) return 'Aktuell ist kein Forecast offen.';
    if (!Number.isFinite(a.umsatz) || !Number.isFinite(a.ebitda)) return 'Ungültige Zielwerte.';
    const faktor = f.ziele.umsatz ? a.umsatz / f.ziele.umsatz : 1;
    if (faktor < 0 || faktor > 3) return 'Umsatz außerhalb des zulässigen Rahmens.';
    f.ziele.umsatz = eur(a.umsatz); f.ziele.ebitda = eur(a.ebitda);
    const cutoff = f.quartal * 13;
    for (let i = cutoff; i < 52; i++) f.wochenUmsatz[i] = eur(f.wochenUmsatz[i] * faktor);
    f.korrigiert = true; return null;
  }
  const ent = p.entwurf;
  if (!ent || ent.stand !== 'offen' || kw(s.woche) < 40 || kw(s.woche) > 44) return 'Jahresplanung nur in KW 40 bis 44 möglich.';
  if (a.typ === 'planungZiel') {
    if (!Number.isFinite(a.wert) || a.wert < 0 && a.kennzahl !== 'ebitda') return 'Ungültiger Zielwert.';
    ent.ziele[a.kennzahl] = eur(a.wert); return null;
  }
  if (a.typ === 'planungVerteilen') {
    if (!Number.isFinite(a.umsatz) || a.umsatz < 0) return 'Ungültiger Zielwert.';
    const probe = machKnoten(s, ent.ziele, ent.overrides);
    if (!probe[a.id] || a.id === 'konzern') return 'Unbekannte Planungsebene.';
    const parent = probe[a.id].parent ? probe[probe[a.id].parent!] : undefined;
    if (parent && a.umsatz > parent.umsatz) return 'Teilziel übersteigt das übergeordnete Budget.';
    ent.overrides[a.id] = eur(a.umsatz); return null;
  }
  if (a.typ === 'planungAbschliessen') { abschliessen(s, a.quelle); return null; }
  return 'Unbekannte Planungsaktion.';
}
export type PlanungAktion =
  | { typ: 'planungZiel'; kennzahl: keyof PlanZiele; wert: number }
  | { typ: 'planungVerteilen'; id: string; umsatz: number }
  | { typ: 'planungAbschliessen'; quelle: 'controlling' | 'spieler' }
  | { typ: 'planungForecast'; umsatz: number; ebitda: number }
  | { typ: 'planungBonus'; ebene: keyof PlanungStand['bonusAnteil']; anteil: number };
export const PLANUNG_AKTIONEN = new Set<PlanungAktion['typ']>(['planungZiel', 'planungVerteilen', 'planungAbschliessen', 'planungForecast', 'planungBonus']);

function abschliessen(s: GameState, quelle: Jahresplan['quelle']): void {
  const e = s.planung!.entwurf; if (!e || e.stand !== 'offen') return;
  const plan = erstelleJahresplan(s, e.jahr, e.ziele, e.overrides, quelle);
  s.planung!.jahre = s.planung!.jahre.filter((p) => p.jahr !== plan.jahr).concat(plan);
  e.stand = 'abgeschlossen';
  s.entscheidungen = s.entscheidungen.filter((x) => x.typ !== 'planung_jahr' || x.daten.jahr !== e.jahr);
  melde(s, 'info', 'Jahresplanung ' + plan.jahr + ' beschlossen: Konzernziel ' + Math.round(plan.ziele.umsatz / 1e6) + ' Mio. € Umsatz.', { modul: 'planung' });
}
export function planungEntscheidung(s: GameState, e: Entscheidung, option: string): void {
  if (e.typ === 'planung_jahr') {
    if (s.planung?.entwurf?.jahr === e.daten.jahr && s.planung.entwurf.stand === 'offen') {
      if (option === 'controlling') abschliessen(s, 'controlling');
      else if (option === 'anpassen') abschliessen(s, 'spieler');
    }
  } else if (e.typ === 'planung_forecast') {
    const f = s.planung?.forecasts.find((x) => x.jahr === e.daten.jahr && x.quartal === e.daten.quartal);
    if (f && f.status === 'offen') {
      f.status = option === 'abgeben' ? 'abgegeben' : 'zurueckgehalten';
      melde(s, 'info', f.bezeichnung + '-Forecast ' + f.jahr + ': ' + (f.status === 'abgegeben' ? 'an Eigentümer und Bank abgegeben.' : 'zurückgehalten.'), { modul: 'planung' });
    }
  }
}
function entscheidung(s: GameState, typ: string, titel: string, text: string, optionen: { id: string; label: string }[], standard: string, frist: number, daten: Entscheidung['daten']): void {
  if (s.entscheidungen.some((e) => e.typ === typ && e.daten.jahr === daten.jahr && e.daten.quartal === daten.quartal)) return;
  s.entscheidungen.push({ id: neueId(s, 'pl'), typ, titel, text, woche: s.woche, frist, optionen, standard, daten });
}

function forecastErstellen(s: GameState, q: 1 | 2 | 3): void {
  const p = planJahr(s); if (!p || !s.planung) return;
  const n = q * 13, bisher = s.historie.filter((k) => jahr(s, k.woche) === p.jahr).slice(0, n);
  const wochen = Array.from({ length: 52 }, (_, i) => sum(Object.values(p.phasing).map((v) => v[i])));
  // Ist bis einschließlich Quartalsende, danach Prognose auf Basis der Planwochen und Ist-Trend.
  const ytdPlan = sum(wochen.slice(0, n));
  const ytdIst = sum(bisher.map((x) => x.umsatz));
  const qualitaet = clamp(0.35 + s.controllingStufe * 0.25, 0, 1);
  const trend = clamp(anteil(ytdIst, Math.max(1, ytdPlan)) - 1, -0.2, 0.2);
  for (let i = 0; i < n; i++) wochen[i] = bisher[i]?.umsatz ?? 0;
  for (let i = n; i < 52; i++) wochen[i] = eur(wochen[i] * (1 + trend * (0.5 + 0.5 * qualitaet)));
  const istEbitda = sum(bisher.map((x) => x.ebitda));
  const restPlan = p.ziele.ebitda * (52 - n) / 52;
  const forecast: Quartalsforecast = { jahr: p.jahr, quartal: q, bezeichnung: (['3+9','6+6','9+3'] as const)[q-1],
    woche: s.woche, ziele: { ...p.ziele, umsatz: sum(wochen), ebitda: eur(istEbitda + restPlan * (1 + trend * qualitaet)) },
    wochenUmsatz: wochen, status: 'offen', korrigiert: false };
  s.planung.forecasts.push(forecast);
  entscheidung(s, 'planung_forecast', forecast.bezeichnung + '-Forecast ' + p.jahr,
    'Controlling meldet ' + Math.round(forecast.ziele.umsatz / 1e6) + ' Mio. € erwarteten Jahresumsatz. Prognose im Planungsassistenten korrigieren oder freigeben.',
    [{ id: 'abgeben', label: 'An Eigentümer und Bank abgeben' }, { id: 'zurueckhalten', label: 'Zurückhalten' }], 'abgeben', s.woche + 3, { jahr: p.jahr, quartal: q });
}

export function forecastVertrauensDelta(abweichung: number): number {
  const a = Math.abs(abweichung);
  if (a < 0.02) return 2;
  if (a > 0.10) return -6;
  if (a > 0.05) return abweichung > 0 ? -1 : -3;
  return 0;
}
function vertrauenPruefen(s: GameState, quartal: number): void {
  if (!s.planung) return;
  const p = planJahr(s); if (!p) return;
  const letztes = s.planung.forecasts.filter((f) => f.jahr === p.jahr && f.status === 'abgegeben' && f.quartal < quartal).at(-1);
  // Im ersten Quartal liegt noch kein Forecast vor. Dort wird kein künstlicher Malus erzeugt.
  if (!letztes) return;
  const grenze = quartal * 13;
  const soll = sum(letztes.wochenUmsatz.slice(0, grenze));
  const ist = sum(s.historie.filter((k) => jahr(s, k.woche) === p.jahr).slice(0, grenze).map((k) => k.umsatz));
  const abw = anteil(ist - soll, Math.max(1, soll));
  const d = forecastVertrauensDelta(abw);
  s.stakeholder.bank = clamp(s.stakeholder.bank + d, 0, 100);
  s.stakeholder.eigentuemer = clamp(s.stakeholder.eigentuemer + d, 0, 100);
  s.planung.vertrauenVerlauf.push({ woche: s.woche, delta: d, abweichung: abw });
  melde(s, d < 0 ? 'warnung' : 'info', 'Forecast-Trefferquote: ' + (100 * abw).toFixed(1).replace('.', ',') + ' % Abweichung. Bank und Eigentümer ' + (d > 0 ? '+' : '') + d + ' Vertrauen.', { modul: 'planung' });
}

function bonusErmitteln(s: GameState, p: Jahresplan): void {
  if (!s.planung || s.planung.boni.some((x) => x.jahr === p.jahr)) return;
  const details: PlanBonus['details'] = [];
  const quoten = s.planung.bonusAnteil;
  const hausZiele = Object.fromEntries(s.haeuser.map((h) => [h.id, p.knoten['haus:' + h.id]?.umsatz ?? 0]));
  const score = (ist: number, ziel: number) => clamp(anteil(ist, Math.max(1, ziel)), 0, 1.25);
  const ebitdaScore = p.ziele.ebitda > 0 ? score(p.istEbitda, p.ziele.ebitda) : clamp(1 + (p.istEbitda - p.ziele.ebitda) / Math.max(1, p.ziele.umsatz) * 5, 0, 1.25);
  for (const h of s.haeuser) {
    const annual = p.istHaus[h.id]?.umsatz ?? 0;
    const ziel = hausZiele[h.id];
    if (!ziel) continue;
    const leistungsgrad = 0.5 * score(annual, ziel) + 0.5 * ebitdaScore;
    // Hausleitungsgehalt als parametrisierte Basiskosten (bestehende Lohnkosten enthalten).
    const betrag = eur(68_000 * quoten.haus * leistungsgrad);
    details.push({ id: h.id, ebene: 'haus', betrag });
  }
  const clusterSet = new Set(s.haeuser.map(clusterVon));
  for (const c of clusterSet) {
    const hs = s.haeuser.filter((h) => clusterVon(h) === c);
    const ziel = sum(hs.map((h) => hausZiele[h.id] ?? 0));
    if (!ziel) continue;
    const ist = sum(hs.map((h) => p.istHaus[h.id]?.umsatz ?? 0));
    details.push({ id: c, ebene: 'hauscluster', betrag: eur(105_000 * quoten.hauscluster * (0.5 * score(ist, ziel) + 0.5 * ebitdaScore)) });
  }
  for (const id of ['konzerncontrolling', 'vertriebscontrolling', 'merchandise_planning', 'store_operations']) {
    details.push({ id, ebene: 'bereich', betrag: eur(115_000 * quoten.bereich * (0.5 * score(p.istUmsatz, p.ziele.umsatz) + 0.5 * ebitdaScore)) });
  }
  s.planung.boni.push({ jahr: p.jahr, faellig: (p.jahr - s.startJahr + 1) * 52 + 5, betrag: sum(details.map((x) => x.betrag)), bezahlt: false, details });
}
export function planungBonusWoche(s: GameState, k: WochenKpi): void {
  if (!s.planung || s.prognose) return;
  for (const b of s.planung.boni) if (!b.bezahlt && s.woche >= b.faellig) {
    // Wird vor EBITDA und den Pflichtzahlungen gebucht, kein doppelter Cash-Abzug.
    k.personal += b.betrag;
    b.bezahlt = true;
    melde(s, 'info', 'Führungsboni für ' + b.jahr + ' ausgezahlt: ' + Math.round(b.betrag / 1000) + ' Tsd. € Personalaufwand.', { modul: 'planung' });
  }
}
/** Einmal je Woche nach dem Schreiben von s.historie aufrufen. */
export function planungWoche(s: GameState): void {
  if (s.prognose) return;
  if (!s.planung) initialisierePlanung(s); // alte Spielstände
  const p = planJahr(s);
  const k = s.historie.at(-1);
  if (p && k && k.woche === s.woche) {
    p.istUmsatz += k.umsatz; p.istEbitda += k.ebitda;
    for (const h of s.haeuser) if (h.kpi?.woche === s.woche) {
      const u = p.istHaus[h.id] ??= { umsatz: 0, db: 0 };
      u.umsatz += h.kpi.umsatz; u.db += h.kpi.db;
      const node = p.knoten['haus:' + h.id]; if (node) node.ist = u.umsatz;
    }
  }
  const beendetQ = (s.woche + 1) % 13 === 0;
  const q = Math.floor((s.woche % 52) / 13) + 1;
  if (beendetQ) {
    vertrauenPruefen(s, q);
    if (q < 4) forecastErstellen(s, q as 1 | 2 | 3);
    else if (p && !p.geschlossen) { p.geschlossen = true; bonusErmitteln(s, p); }
  }
  // Die Vorlage liegt dem Spieler ab KW40 vor und wird nach KW44 automatisch übernommen.
  if ((s.woche + 1) % 52 === 39) {
    const next = jahr(s, s.woche + 1) + 1;
    if (!s.planung!.entwurf || s.planung!.entwurf.jahr !== next) {
      s.planung!.entwurf = { jahr: next, ziele: jahresVorschlag(s, next), overrides: {}, stand: 'offen' };
      entscheidung(s, 'planung_jahr', 'Jahresplanung ' + next,
        'Konzerncontrolling legt die Top-down-Ziele vor. Hauscluster melden Bottom-up zurück; im Planungsassistenten können Ziele übersteuert werden.',
        [{ id: 'controlling', label: 'Controlling-Vorschlag übernehmen' }, { id: 'anpassen', label: 'Aktuelle Anpassungen beschließen' }], 'controlling', s.woche + 5, { jahr: next });
    }
  }
  if ((s.woche + 1) % 52 === 0 && s.planung!.entwurf?.stand === 'offen') abschliessen(s, 'controlling');
  if ((s.woche + 1) % 52 === 0) {
    const next = jahr(s, s.woche + 1);
    if (!planJahr(s, next)) {
      const ziele = jahresVorschlag(s, next);
      s.planung!.jahre.push(erstelleJahresplan(s, next, ziele, {}, 'controlling'));
    }
  }
  if (s.planung!.jahre.length > 11) s.planung!.jahre.splice(0, s.planung!.jahre.length - 11);
}
export function planungBericht(s: GameState) {
  const p = planJahr(s);
  if (!p) return { jahr: jahr(s), ziele: null, entwurf: s.planung?.entwurf, knoten: [], forecasting: null, quoten: s.planung?.bonusAnteil, boni: s.planung?.boni ?? [] };
  const vor = s.planung?.forecasts.filter((f) => f.jahr === p.jahr && f.status === 'abgegeben').at(-1);
  const abgelaufene = s.woche % 52;
  const ist = sum(s.historie.filter((k) => jahr(s, k.woche) === p.jahr).map((k) => k.umsatz));
  const soll = sum(Object.values(p.phasing).flatMap((xs) => xs.slice(0, abgelaufene)));
  const f = vor?.ziele.umsatz;
  return { jahr: p.jahr, ziele: p.ziele, entwurf: s.planung?.entwurf,
    knoten: Object.values(p.knoten).map((n) => ({ ...n, abweichung: n.umsatz ? (n.ist - n.umsatz * abgelaufene / 52) / n.umsatz : 0 })),
    ist, planBisHeute: soll, abweichung: ist - soll, forecasting: f ?? null, forecasts: s.planung?.forecasts.filter((x) => x.jahr === p.jahr) ?? [],
    quoten: s.planung?.bonusAnteil, boni: s.planung?.boni ?? [], vertrauen: s.planung?.vertrauenVerlauf ?? [] };
}

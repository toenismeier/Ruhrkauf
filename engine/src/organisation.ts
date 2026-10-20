// O01 Organisation: zentrale Bereiche, regionale Vertriebslinie und deterministische Hauscluster.
import type { GameState, Haus, Region, Entscheidung } from './types';
import type { AbteilungId } from './hq';
import type { RessortId, Portraet } from './vorstand';
import { RESSORT_INFO, DELEGATIONEN } from './vorstand';
import { KOORDINATEN } from './standorte';
import { HAUSCLUSTER_NAMEN, VORNAMEN, NACHNAMEN } from './daten';
import { clamp, eur } from './util';
import { einmalKosten } from './prozesse';
import { itDeckel } from './it';

export type BereichId = string;
export interface Bereich { id: BereichId; name: string; ressort: RessortId; abteilung: AbteilungId; beschreibung: string }
const b = (id: string, name: string, ressort: RessortId, abteilung: AbteilungId, beschreibung: string): Bereich => ({ id, name, ressort, abteilung, beschreibung });
export const BEREICHE: Bereich[] = [
  b('konzerncontrolling','Konzerncontrolling','cfo','controlling','GuV, Bilanz und Liquidität'),
  b('vertriebscontrolling','Vertriebscontrolling','cfo','controlling','Hauskennzahlen und Vertriebsanalysen'),
  b('finanzen','Finanzen','cfo','verwaltung','Treasury und Rechnungswesen'),
  b('recht','Recht','cfo','recht','Verträge und Compliance'),
  b('einkauf_damen','Einkauf Damen','cpo','einkauf','Damenmode und Wäsche'),
  b('einkauf_herren_kinder','Einkauf Herren & Kinder','cpo','einkauf','Herren- und Kindermode'),
  b('einkauf_beauty','Einkauf Beauty & Accessoires','cpo','einkauf','Beauty und Accessoires'),
  b('einkauf_wohnen','Einkauf Wohnen & Spielwaren','cpo','einkauf','Wohnen und Spielwaren'),
  b('einkauf_food','Einkauf Food','cpo','einkauf','Lebensmittel und Feinkost'),
  b('merchandise_planning','Merchandise Planning','cpo','einkauf','Sortiments- und Budgetplanung'),
  b('allokation','Allokation & Nachschub','cpo','einkauf','Bestandsverteilung in die Häuser'),
  b('preis_reduzierung','Preis- & Reduzierungsmanagement','cpo','einkauf','Preise und Abschriften'),
  b('eigenmarken','Eigenmarken','cpo','produkt','Entwicklung und Pflege eigener Marken'),
  b('vertriebssteuerung','Vertriebssteuerung','cso','controlling','Steuerung der Regionen'),
  b('store_operations','Store Operations','cso','verwaltung','Standards im operativen Hausbetrieb'),
  b('flagship_management','Flagship-Management','cso','vm','Premiumhäuser und Flaggschiffe'),
  b('logistik','Logistik','coo','logistik','Lager und Warenverkehr'),
  b('flaechenmanagement','Flächenmanagement','coo','immobilien','Nutzung und Vermietung von Flächen'),
  b('immobilien','Immobilien','coo','immobilien','Mietverträge und Immobilienportfolio'),
  b('ladenbau','Bau & Ladenbau','coo','immobilien','Modernisierung und Umbauten'),
  b('facility','Facility & Energie','coo','immobilien','Technik und Energieversorgung'),
  b('personaleinsatz','Personaleinsatzplanung','chro','personal','Personalbedarf und Dienstplanung'),
  b('recruiting','Recruiting','chro','personal','Gewinnung von Mitarbeitern'),
  b('weiterbildung','Aus- & Weiterbildung','chro','personal','Qualifikation und Entwicklung'),
  b('arbeitsbeziehungen','Arbeitsbeziehungen','chro','personal','Sozialpartner und Tarif'),
  b('marketing','Marketing','cmo','marketing','Kampagnen und Media'),
  b('crm','CRM','cmo','marketing','Kundenbindung und Kundenkarte'),
  b('vm_deko','VM & Deko','cmo','vm','Visual Merchandising und Dekoration'),
  b('ecommerce','E-Commerce','cdo','ecommerce','Onlineshop'),
  b('it','IT','cdo','ecommerce','Systembetrieb und Projekte'),
  b('bi_daten','BI & Daten','cdo','controlling','Reporting und Datenplattform'),
];
export const ALTE_DELEGATIONEN: Record<string, BereichId> = {
  'cfo.zahlungsplanung':'finanzen', 'cfo.bank':'konzerncontrolling',
  'coo.filialpersonal':'store_operations', 'coo.personalbedarf':'store_operations',
  'cso.filialbesetzung':'vertriebssteuerung', 'cso.flaechenvermietung':'flagship_management',
  'cpo.freigaben':'merchandise_planning', 'cpo.dispo':'allokation', 'cpo.produktentwicklung':'eigenmarken',
  'cmo.aktionskalender':'marketing', 'cmo.crm':'crm', 'cmo.kanalbudget':'marketing',
  'chro.betriebsrat':'arbeitsbeziehungen', 'chro.personalplanung':'personaleinsatz',
  'cro.schliessungen':'immobilien', 'cro.mietverhandlungen':'immobilien',
  'cdo.onlinesortiment':'ecommerce',
};
/** Aufgabenbezogene Delegation. Legacy-Schalter gelten für alle Aufgaben ohne eigenen Override. */
export interface DelegationsAufgabe { id: string; name: string; grenze?: number }
const task = (id: string, name: string, grenze?: number): DelegationsAufgabe => ({ id, name, ...(grenze ? { grenze } : {}) });
const ALLGEMEIN = [task('planung', 'Planung und Prioritäten'), task('freigaben', 'Routinefreigaben', 50000)] as const;
const AUFGABEN_NACH_BEREICH: Record<string, DelegationsAufgabe[]> = {
  einkauf_damen: [task('nachorder', 'Nachorder'), task('limits', 'Sortimentslimits', 50000), task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000)],
  einkauf_herren_kinder: [task('nachorder', 'Nachorder'), task('limits', 'Sortimentslimits', 50000), task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000)],
  einkauf_beauty: [task('nachorder', 'Nachorder'), task('limits', 'Sortimentslimits', 50000), task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000)],
  einkauf_wohnen: [task('nachorder', 'Nachorder'), task('limits', 'Sortimentslimits', 50000), task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000)],
  einkauf_food: [task('nachorder', 'Nachorder'), task('limits', 'Sortimentslimits', 50000), task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000)],
  merchandise_planning: [task('limits', 'Open-to-Buy-Limits', 50000), task('vororder', 'Saison-Vororder', 50000), task('freigaben', 'Bestellfreigaben', 50000)],
  allokation: [task('nachorder', 'Nachorder'), task('disposition', 'NOS-Disposition'), task('umlagerung', 'Warenumlagerungen', 20000)],
  preis_reduzierung: [task('reduzierung', 'Reduzierungen'), task('altware', 'Altwarenabgabe an FUNDUS', 20000), task('preise', 'Preispflege')],
  eigenmarken: [task('produkte', 'Produktentwicklung', 50000), task('positionierung', 'Markenpositionierung', 100000), task('sortiment', 'Sortiment und Auslistung')],
  personaleinsatz: [task('einsatz', 'Einsatzplanung'), task('aushilfen', 'Aushilfen', 10000), task('schicht', 'Schichtänderungen')],
  recruiting: [task('einstellung', 'Einstellungen', 50000), task('angebote', 'Kandidatenangebote', 10000)],
  arbeitsbeziehungen: [task('verhandlung', 'Betriebsratsverhandlungen'), task('vereinbarung', 'Betriebsvereinbarungen', 100000)],
  marketing: [task('aktionen', 'Aktionen', 100000), task('mailings', 'Mailings', 50000), task('budget', 'Kanalbudget', 50000)],
  crm: [task('mailings', 'CRM-Mailings', 50000), task('segment', 'Kundensegmente'), task('karte', 'Kundenkarte und App', 50000)],
  store_operations: [task('oeffnungszeiten', 'Öffnungszeiten'), task('sofortmassnahmen', 'Ad-hoc-Maßnahmen', 20000), task('reparaturen', 'Reparaturen', 10000)],
  facility: [task('reparaturen', 'Reparaturen', 10000), task('wartung', 'Wartung', 50000), task('energie', 'Energieplanung')],
};
export const CLUSTER_AUFGABEN: DelegationsAufgabe[] = [
  task('oeffnungszeiten', 'Öffnungszeiten'), task('sofortmassnahmen', 'Ad-hoc-Maßnahmen', 20000),
  task('reparaturen', 'Reparaturen', 10000), task('aushilfen', 'Aushilfen', 10000),
  task('einsatz', 'Personaleinsatzplanung'),
];
export function delegationsAufgaben(bereich?: BereichId, hauscluster?: string): DelegationsAufgabe[] {
  if (hauscluster) return CLUSTER_AUFGABEN;
  if (!bereich || !BEREICHE.some((b) => b.id === bereich)) return [];
  return AUFGABEN_NACH_BEREICH[bereich] ?? ALLGEMEIN.slice();
}
export interface OrgPerson {
  id: string; name: string; portraet: Portraet; qualitaet: number; gehalt: number;
  stimmung: number; wechselwille: number;
}
export interface Stelle {
  person?: OrgPerson; kandidaten: OrgPerson[]; delegiert: boolean; basis: number;
  /** Optional, damit ältere Spielstände und Sammeldelegation kompatibel bleiben. */
  aufgaben?: Record<string, boolean>;
  grenzen?: Record<string, number>;
}
export interface Hauscluster {
  id: string; name: string; region?: Region; hausIds: string[]; sonder: boolean;
  stelle: Stelle;
}
export interface OrganisationsStand {
  hauscluster: Hauscluster[];
  bereiche: Record<BereichId, Stelle>;
  regionalleitungen: Record<Region, Stelle>;
  /** Die geografische Zuordnung bleibt auch bei Flagship-Wechseln für Vergleiche stabil. */
  geografisch: Record<string, string>;
  flagships: string[];
  unruhe: Record<string, { bis: number; moral: number }>;
  letzteBesetzung: Partial<Record<RessortId, boolean>>;
  letzteVakanz: Record<string, boolean>;
  basisKosten: number;
  zaehler: number;
}
export interface VorlageEingabe {
  titel: string; text: string; bereich?: BereichId; hauscluster?: string; frist?: number;
  optionen?: { id: string; label: string }[]; standard?: string; grundsaetzlich?: boolean;
  aktion?: OrganisationAktion; aufgabe?: string; betrag?: number;
}
export type OrganisationAktion =
  | { typ: 'flagship'; haus: string; an: boolean }
  | { typ: 'delegation'; bereich?: BereichId; hauscluster?: string; aufgabe?: string; an: boolean }
  | { typ: 'delegationGrenze'; bereich?: BereichId; hauscluster?: string; aufgabe: string; betrag: number }
  | { typ: 'organisationBesetzen'; ebene: 'bereich' | 'cluster' | 'region'; id: string; kandidat: string }
  | { typ: 'organisationEntlassen'; ebene: 'bereich' | 'cluster' | 'region'; id: string }
  | { typ: 'organisationHaltepraemie'; ebene: 'bereich' | 'cluster' | 'region'; id: string; betrag: number }
  | { typ: 'organisationBefoerdern'; haus: string; hauscluster: string };
export const ORGANISATION_AKTIONEN = new Set<string>(['flagship','delegation','delegationGrenze','organisationBesetzen','organisationEntlassen','organisationHaltepraemie','organisationBefoerdern']);
const REGIONEN: Region[] = ['Nord','Ost','West','Mitte','Süd'];
const hash = (str: string): number => [...str].reduce((v, c) => Math.imul(v, 31) + c.charCodeAt(0) >>> 0, 2166136261);
const mix = (seed: number, text: string) => hash(seed + ':' + text);
function person(seed: number, key: string, n: number, qualitaet?: number): OrgPerson {
  const z = mix(seed, key + ':' + n), q = qualitaet ?? (0.48 + (z % 430) / 1000);
  const weiblich = z % 2 === 0;
  return {
    id: key + '-' + n, name: VORNAMEN[z % VORNAMEN.length] + ' ' + NACHNAMEN[Math.floor(z / 41) % NACHNAMEN.length],
    qualitaet: Math.round(q * 1000) / 1000,
    gehalt: eur((65_000 + q * 115_000) / 1000) * 1000,
    stimmung: 68 + z % 20, wechselwille: 0.08 + (z % 26) / 100,
    portraet: { geschlecht: weiblich ? 'w' : 'm', haar: weiblich ? 'bob' : 'kurz',
      haarfarbe: z % 4 === 0 ? 'grau' : 'braun', brille: z % 3 === 0 ? 'eckig' : 'keine',
      kleidungFarbe: z % 2 === 0 ? 'marine' : 'anthrazit', hautton: z % 5, alter: 38 + z % 26,
      kleidung: weiblich ? 'blazer' : 'anzug', bart: 'keiner' },
  };
}
function stelle(seed: number, key: string): Stelle {
  const start = person(seed, key, 0, 0.65 + (mix(seed, key) % 170) / 1000);
  return { person: start, kandidaten: [1,2,3].map((i) => person(seed, key, i)), delegiert: false, basis: start.qualitaet };
}
const distanz = (a: Haus, b: Haus): number => {
  const x = KOORDINATEN[a.stadt], y = KOORDINATEN[b.stadt];
  if (!x || !y) return a.stadt === b.stadt ? 0 : 1e7;
  return Math.pow((x[0]-y[0]) * 111, 2) + Math.pow((x[1]-y[1]) * 70, 2);
};
const nord = (a: Haus, b: Haus): number =>
  (KOORDINATEN[b.stadt]?.[0] ?? 0) - (KOORDINATEN[a.stadt]?.[0] ?? 0) || a.id.localeCompare(b.id);
function gruppiere(haeuser: Haus[]): Haus[][] {
  const frei = [...haeuser].sort(nord), ergebnis: Haus[][] = [];
  while (frei.length) {
    if (ergebnis.length && frei.length < 6) { ergebnis[ergebnis.length - 1].push(...frei.splice(0)); break; }
    const start = frei.shift()!, gruppe = [start];
    // Die Zielgröße wird so begrenzt, dass kein unnötiger Restcluster unter sechs Häusern entsteht.
    const gesamt = frei.length + 1;
    const ziel = gesamt > 12 && gesamt - 11 < 6 ? gesamt - 6 : Math.min(11, gesamt);
    while (gruppe.length < ziel && frei.length) {
      let k = 0;
      for (let i = 1; i < frei.length; i++) {
        const d = Math.min(...gruppe.map((h) => distanz(h, frei[i])));
        const alt = Math.min(...gruppe.map((h) => distanz(h, frei[k])));
        if (d < alt || (d === alt && frei[i].id.localeCompare(frei[k].id) < 0)) k = i;
      }
      gruppe.push(frei.splice(k, 1)[0]);
    }
    ergebnis.push(gruppe);
  }
  return ergebnis;
}
/** Einmalige, RNG-neutrale Initialisierung am Ende von neueWelt. */
export function bildeHauscluster(s: GameState): void {
  const organisation: OrganisationsStand = {
    hauscluster: [], geografisch: {}, flagships: [], unruhe: {}, zaehler: 0,
    bereiche: {}, regionalleitungen: {} as Record<Region, Stelle>, letzteBesetzung: {}, letzteVakanz: {}, basisKosten: 0,
  };
  for (const bereich of BEREICHE) organisation.bereiche[bereich.id] = stelle(s.seed, 'bereich-' + bereich.id);
  for (const region of REGIONEN) {
    organisation.regionalleitungen[region] = stelle(s.seed, 'region-' + region);
    const einheiten = gruppiere(s.haeuser.filter((h) => h.region === region && h.status === 'offen'));
    einheiten.forEach((gruppe, i) => {
      const namen = HAUSCLUSTER_NAMEN[region], basis = namen[i % namen.length];
      const nummer = i >= namen.length ? ' ' + (Math.floor(i / namen.length) + 1) : '';
      const id = 'hc-' + region.toLocaleLowerCase('de') + '-' + (i+1);
      organisation.hauscluster.push({ id, name: basis + nummer, region, hausIds: gruppe.map((h) => h.id), sonder: false, stelle: stelle(s.seed, id) });
      gruppe.forEach((h) => { h.hauscluster = id; organisation.geografisch[h.id] = id; });
    });
  }
  const premium = s.haeuser.filter((h) => h.klasse === 'premium').map((h) => h.id);
  organisation.hauscluster.push({ id: 'premium-flagships', name: 'Premium & Flagships', hausIds: premium, sonder: true, stelle: stelle(s.seed, 'premium-flagships') });
  for (const r of Object.keys(s.vorstand.ressorts) as RessortId[]) organisation.letzteBesetzung[r] = !!s.vorstand.ressorts[r].person;
  organisation.basisKosten = leitungsKosten(organisation);
  s.organisation = organisation;
}
function leitungsKosten(o: OrganisationsStand): number {
  return [...Object.values(o.bereiche),...Object.values(o.regionalleitungen),...o.hauscluster.map((x)=>x.stelle)]
    .reduce((sum,x)=>sum+(x.person?.gehalt??0),0);
}
/** Mehr- oder Minderkosten gegenüber den in der Startzentrale enthaltenen Leitungsgehältern. */
export function organisationLeitungKostenWoche(s: GameState): number {
  return s.organisation ? eur((leitungsKosten(s.organisation)-s.organisation.basisKosten)/52) : 0;
}
export function hausclusterVon(s: GameState, hausId: string): Hauscluster | undefined {
  const o = s.organisation;
  if (!o) return undefined;
  // O(Clusterzahl) statt einer zusätzlichen Vollsuche durch alle Häuser je Wochenberechnung.
  const sonder = o.hauscluster[o.hauscluster.length - 1];
  const id = o.flagships.includes(hausId) || (sonder?.sonder && sonder.hausIds.includes(hausId))
    ? 'premium-flagships' : o.geografisch[hausId];
  return o.hauscluster.find((x) => x.id === id);
}
export function clusterleitungQualitaet(s: GameState, hcId: string): number {
  return clamp(s.organisation?.hauscluster.find((x) => x.id === hcId)?.stelle.person?.qualitaet ?? 0.35, 0, 1);
}
export function regionalleitungQualitaet(s: GameState, region: Region): number {
  return clamp(s.organisation?.regionalleitungen[region]?.person?.qualitaet ?? 0.35, 0, 1);
}
export function clusterBerichtetAn(s: GameState, hcId: string): 'spieler' | 'cso' | Region {
  const cluster = s.organisation?.hauscluster.find((x) => x.id === hcId);
  if (cluster?.region && s.organisation?.regionalleitungen[cluster.region]?.person) return cluster.region;
  return s.vorstand?.ressorts.cso.person ? 'cso' : 'spieler';
}
export function berichtetAn(s: GameState, id: BereichId): 'spieler' | RessortId {
  const bereich = BEREICHE.find((x) => x.id === id);
  return bereich && s.vorstand?.ressorts[bereich.ressort]?.person ? bereich.ressort : 'spieler';
}
export function istDelegiert(s: GameState, id: BereichId): boolean {
  const bereich = BEREICHE.find((x) => x.id === id);
  if (!bereich) return false;
  return !!s.organisation?.bereiche[id]?.delegiert ||
    Object.entries(ALTE_DELEGATIONEN).some(([k, neu]) => {
      const [ressort, delegationsId] = k.split('.') as [RessortId, string];
      return neu === id && !!s.vorstand?.ressorts[ressort]?.delegation[delegationsId];
    });
}
/** Aufgabenoverride vor Sammeldelegation; vakante Leitung kann nicht selbst entscheiden. */
export function istAufgabeDelegiert(s: GameState, aufgabe: string, bereich?: BereichId, hauscluster?: string): boolean {
  const st = bereich ? s.organisation?.bereiche[bereich] : s.organisation?.hauscluster.find((c) => c.id === hauscluster)?.stelle;
  if (!st || !st.person || !delegationsAufgaben(bereich, hauscluster).some((a) => a.id === aufgabe)) return false;
  return st.aufgaben?.[aufgabe] ?? (bereich ? istDelegiert(s, bereich) : !!st.delegiert);
}
export function delegationsGrenze(s: GameState, aufgabe: string, bereich?: BereichId, hauscluster?: string): number | undefined {
  const def = delegationsAufgaben(bereich, hauscluster).find((x) => x.id === aufgabe);
  const st = bereich ? s.organisation?.bereiche[bereich] : s.organisation?.hauscluster.find((x) => x.id === hauscluster)?.stelle;
  return def?.grenze ? (st?.grenzen?.[aufgabe] ?? def.grenze) : undefined;
}
export function bereichsQualitaet(s: GameState, id: BereichId): number {
  const def = BEREICHE.find((x) => x.id === id), st = s.organisation?.bereiche[id];
  if (!def || !st) return 0;
  const person = st.person?.qualitaet ?? 0.35;
  const hqStufe = clamp((s.hq?.wirkung?.[def.abteilung] ?? 1), 0, 3) / 1;
  const chef = s.vorstand?.ressorts[def.ressort]?.person;
  const vorstand = chef ? clamp(1 + (chef.fuehrung / 100 - 0.5) * 0.3, 0.85, 1.15) : 1;
  return clamp(person * hqStufe * vorstand * itDeckel(s, id), 0, 1);
}
/** Startfaktor 1: ein Führungswechsel beeinflusst die Nachfrage, nicht die Basiskalibrierung. */
export function hausclusterFaktor(s: GameState, h: Haus): number {
  const hc = hausclusterVon(s, h.id), reg = s.organisation?.regionalleitungen[h.region];
  if (!hc || !reg) return 1;
  const hcQual = hc.stelle.person?.qualitaet ?? 0.35;
  const regQual = reg.person?.qualitaet ?? 0.35;
  return clamp(1 + 0.12 * (hcQual - hc.stelle.basis) + 0.08 * (regQual - reg.basis), 0.85, 1.15);
}
export function neueVorlage(s: GameState, v: VorlageEingabe): void {
  if (s.prognose || !s.organisation) return;
  const bereich = v.bereich ? BEREICHE.find((b) => b.id === v.bereich) : undefined;
  const cluster = v.hauscluster ? s.organisation.hauscluster.find((c) => c.id === v.hauscluster) : undefined;
  const chef = bereich ? berichtetAn(s, bereich.id) : cluster ? clusterBerichtetAn(s, cluster.id) : 'spieler';
  const delegiert = v.aufgabe
    ? istAufgabeDelegiert(s, v.aufgabe, bereich?.id, cluster?.id)
    : bereich ? istDelegiert(s, bereich.id) : !!cluster?.stelle.delegiert;
  const grenze = v.aufgabe ? delegationsGrenze(s, v.aufgabe, bereich?.id, cluster?.id) : undefined;
  const innerhalbGrenze = grenze === undefined || (v.betrag !== undefined && v.betrag <= grenze);
  // Die Leitung entscheidet innerhalb ihrer Befugnis. Ihr Qualitätswert bestimmt,
  // ob sie einen sinnvollen Vorschlag übernimmt; keine Änderung am globalen RNG.
  if (chef !== 'spieler' && delegiert && !v.grundsaetzlich && innerhalbGrenze) {
    if (v.aktion) {
      const guete = bereich ? bereichsQualitaet(s, bereich.id) : clusterleitungQualitaet(s, cluster!.id);
      const schwelle = (mix(s.seed, (v.aufgabe ?? v.titel) + ':' + s.woche) % 1000) / 1000;
      if (schwelle < 0.3 + 0.65 * guete) organisationAktion(s, v.aktion);
    }
    return;
  }
  const prefix = bereich?.name ?? cluster?.name ?? 'Organisation';
  s.entscheidungen.push({
    id: 'org-v-' + (++s.organisation.zaehler), typ: 'organisation_vorlage', woche: s.woche,
    frist: s.woche + (v.frist ?? 3), titel: v.titel, text: prefix + ': ' + v.text,
    optionen: v.optionen ?? [{ id:'vorschlag', label:'Vorschlag der Leitung übernehmen' },{ id:'ablehnen',label:'Ablehnen' }],
    standard: v.standard ?? 'vorschlag',
    daten: { bereich: bereich?.id ?? '', hauscluster: cluster?.id ?? '', aufgabe: v.aufgabe ?? '', absender: prefix, aktion: v.aktion ? JSON.stringify(v.aktion) : '' },
  });
}
export function organisationVorlageEntscheidung(s: GameState, e: Entscheidung, option: string): void {
  // Fristablauf nutzt denselben Leitungsvorschlag wie die manuelle Freigabe.
  if (option !== 'vorschlag' || typeof e.daten.aktion !== 'string' || !e.daten.aktion) return;
  const a = JSON.parse(e.daten.aktion) as OrganisationAktion;
  organisationAktion(s,a);
}
function stelleFuer(s: GameState, ebene: 'bereich'|'cluster'|'region', id: string): Stelle | undefined {
  if (ebene === 'bereich') return s.organisation?.bereiche[id];
  if (ebene === 'region') return s.organisation?.regionalleitungen[id as Region];
  return s.organisation?.hauscluster.find((h) => h.id === id)?.stelle;
}
export function organisationAktion(s: GameState, a: OrganisationAktion): { ok: boolean; text: string } {
  const o = s.organisation;
  if (!o) return { ok:false, text:'Organisation nicht verfügbar.' };
  if (a.typ === 'flagship') {
    const h = s.haeuser.find((h) => h.id === a.haus);
    if (!h || h.status !== 'offen' || h.format !== 'warenhaus' || h.klasse === 'premium') return { ok:false,text:'Nur offene reguläre Hartwig-Warenhäuser sind auswählbar.' };
    const erlaubt = [...s.haeuser].filter((h) => h.format === 'warenhaus' && h.status === 'offen' && !h.klasse)
      .sort((x,y) => (y.grundflaecheQm*y.etagen.length)-(x.grundflaecheQm*x.etagen.length)).slice(0,12);
    if (a.an && !erlaubt.some((x) => x.id === h.id)) return { ok:false,text:'Flagships müssen zu den größten Warenhäusern gehören.' };
    if (a.an === o.flagships.includes(h.id)) return { ok:true,text:'Keine Änderung.' };
    if (a.an && o.flagships.length >= 12) return { ok:false,text:'Höchstens zwölf Flagships möglich.' };
    o.flagships = a.an ? [...o.flagships,h.id] : o.flagships.filter((id) => id !== h.id);
    const sonder = o.hauscluster.find((x) => x.sonder)!;
    sonder.hausIds = s.haeuser.filter((x) => x.klasse === 'premium' || o.flagships.includes(x.id)).map((x) => x.id);
    h.personal.filialleiter.moral = clamp(h.personal.filialleiter.moral - 10,0,100);
    o.unruhe[h.id] = { bis:s.woche+8, moral:10 };
    return { ok:true,text:a.an ? 'Flagship zugeordnet: acht Wochen Unruhe.' : 'Flagship wieder regional zugeordnet: acht Wochen Unruhe.' };
  }
  if (a.typ === 'delegation' || a.typ === 'delegationGrenze') {
    const st = a.bereich ? o.bereiche[a.bereich] : o.hauscluster.find((c) => c.id === a.hauscluster)?.stelle;
    if (!st) return { ok: false, text: 'Bereich oder Hauscluster nicht gefunden.' };
    if (a.typ === 'delegationGrenze') {
      const def = delegationsAufgaben(a.bereich, a.hauscluster).find((t) => t.id === a.aufgabe);
      if (!def?.grenze || !Number.isFinite(a.betrag) || a.betrag < 0 || a.betrag > 100_000_000)
        return { ok: false, text: 'Ungültige Betragsgrenze oder Aufgabe.' };
      (st.grenzen ??= {})[a.aufgabe] = eur(a.betrag);
      return { ok: true, text: 'Betragsgrenze geändert.' };
    }
    if (a.aufgabe !== undefined) {
      if (!delegationsAufgaben(a.bereich, a.hauscluster).some((t) => t.id === a.aufgabe))
        return { ok: false, text: 'Aufgabe in diesem Bereich nicht vorhanden.' };
      if (a.an && !st.person) return { ok: false, text: 'Ohne Leitung keine Delegation möglich.' };
      (st.aufgaben ??= {})[a.aufgabe] = a.an;
      return { ok: true, text: 'Aufgabe ' + a.aufgabe + (a.an ? ' delegiert.' : ' zur Entscheidung vorgelegt.') };
    }
    // Altaktion: ja/nein setzt weiterhin ausnahmslos alle Aufgaben.
    st.delegiert = a.an;
    st.aufgaben = {};
    if (a.bereich) for (const [alt, neu] of Object.entries(ALTE_DELEGATIONEN)) if (neu === a.bereich) {
      const [r, id] = alt.split('.') as [RessortId, string];
      if (s.vorstand?.ressorts[r]?.delegation && DELEGATIONEN[r].some((d) => d.id === id))
        s.vorstand.ressorts[r].delegation[id] = a.an;
    }
    return { ok: true, text: a.bereich ? 'Bereichsdelegation geändert.' : 'Clusterdelegation geändert.' };
  }
  if (a.typ === 'organisationBefoerdern') {
    const h = s.haeuser.find((x) => x.id === a.haus), cluster = o.hauscluster.find((x) => x.id === a.hauscluster);
    if (!h || !cluster || h.status !== 'offen' || h.personal.filialleiter.skill < 0.7 || hausclusterVon(s,h.id)?.id !== cluster.id) return { ok:false,text:'Nur geeignete Hausleitungen desselben Clusters können befördert werden.' };
    const alt = h.personal.filialleiter;
    cluster.stelle.person = { ...person(s.seed,'bef-' + h.id,s.woche,clamp(alt.skill,0,1)), name: alt.name };
    h.personal.filialleiter = { name:'Stellvertretung ' + h.stadt,skill:Math.max(0.3,alt.skill-0.16),moral:Math.max(30,alt.moral-4),interimBis:s.woche+8 };
    return { ok:true,text:'Hausleitung zur Clusterleitung befördert. Stellvertretung übernimmt.' };
  }
  const st = stelleFuer(s,a.ebene,a.id);
  if (!st) return { ok:false,text:'Leitungsstelle nicht gefunden.' };
  if (a.typ === 'organisationEntlassen') {
    if (!st.person) return { ok:false,text:'Stelle bereits vakant.' };
    einmalKosten(s, eur(st.person.gehalt / 4));
    st.person = undefined;
    return { ok:true,text:'Leitung entlassen. Stelle vakant.' };
  }
  if (a.typ === 'organisationHaltepraemie') {
    if (!st.person || !Number.isFinite(a.betrag) || a.betrag < 0 || a.betrag > 150_000) return { ok:false,text:'Ungültige Halteprämie.' };
    einmalKosten(s, eur(a.betrag));
    st.person.stimmung = clamp(st.person.stimmung + a.betrag / 5000,0,100);
    st.person.wechselwille = clamp(st.person.wechselwille - a.betrag / 500000,0,1);
    return { ok:true,text:'Halteprämie ausgezahlt.' };
  }
  const k = st.kandidaten.find((p) => p.id === a.kandidat);
  if (!k) return { ok:false,text:'Kandidat nicht gefunden.' };
  if (st.person) einmalKosten(s,eur(st.person.gehalt/4));
  st.person = { ...k };
  st.kandidaten = [1,2,3].map((n) => person(s.seed,a.id + '-' + (s.woche+1),n));
  return { ok:true,text:k.name + ' übernimmt die Leitung.' };
}
/** Nur auf explizite Wechsel reagieren: kein neuer Posteingang und kein Kostenimpuls im Standard. */
export function organisationWoche(s: GameState): void {
  const o = s.organisation;
  if (!o || s.prognose) return;
  for (const [hausId, unruhe] of Object.entries(o.unruhe)) {
    if (s.woche >= unruhe.bis) {
      const h = s.haeuser.find((x) => x.id === hausId);
      if (h) h.personal.filialleiter.moral = clamp(h.personal.filialleiter.moral + unruhe.moral,0,100);
      delete o.unruhe[hausId];
    }
  }
  // Aktiv konfigurierte Aufgaben bringen alle vier Wochen eine Routineentscheidung.
  // Unberührte ältere Spielstände erzeugen keine zusätzlichen Vorlagen (Kalibrierung).
  if (s.woche > 0 && s.woche % 4 === 0) {
    const einheiten = [
      ...Object.entries(o.bereiche).map(([id, st]) => ({ st, bereich: id, hauscluster: undefined as string | undefined })),
      ...o.hauscluster.map((c) => ({ st: c.stelle, bereich: undefined as string | undefined, hauscluster: c.id })),
    ];
    for (const x of einheiten) for (const aufgabe of Object.keys(x.st.aufgaben ?? {})) {
      const def = delegationsAufgaben(x.bereich, x.hauscluster).find((d) => d.id === aufgabe);
      if (!def) continue;
      neueVorlage(s, { bereich: x.bereich, hauscluster: x.hauscluster, aufgabe,
        betrag: def.grenze ? Math.min(def.grenze, delegationsGrenze(s, aufgabe, x.bereich, x.hauscluster) ?? def.grenze) : undefined,
        titel: def.name + ': Routineentscheidung KW ' + (s.woche + 1),
        text: 'Die zuständige Leitung legt ihre Entscheidung zu ' + def.name + ' vor.',
        frist: 3 });
    }
  }
  // Neue freie Leitungsstellen erzeugen genau einmal einen befristeten Kandidatenvorschlag.
  const stellen: { id:string; ebene:'bereich'|'cluster'|'region'; st:Stelle }[] = [
    ...Object.entries(o.bereiche).map(([id,st])=>({id,ebene:'bereich' as const,st})),
    ...Object.entries(o.regionalleitungen).map(([id,st])=>({id,ebene:'region' as const,st})),
    ...o.hauscluster.map((c)=>({id:c.id,ebene:'cluster' as const,st:c.stelle})),
  ];
  for(const x of stellen){
    const key=x.ebene+':'+x.id, vakant=!x.st.person;
    if(vakant && !o.letzteVakanz[key]){
      const kandidat=x.st.kandidaten[0];
      if(kandidat) neueVorlage(s,{
        ...(x.ebene==='bereich'?{bereich:x.id}:x.ebene==='cluster'?{hauscluster:x.id}:{}),
        titel:'Leitungswechsel: '+x.id, text:kandidat.name+' als Nachfolge vorschlagen (Jahresgehalt '+kandidat.gehalt+' €).',
        frist:3, aktion:{typ:'organisationBesetzen',ebene:x.ebene,id:x.id,kandidat:kandidat.id},
      });
    }
    o.letzteVakanz[key]=vakant;
  }
  for (const r of ['cpo','cfo','cso','coo','chro','cmo','cdo'] as RessortId[]) {
    const aktuell = !!s.vorstand.ressorts[r].person, vorher = o.letzteBesetzung[r];
    if (vorher === aktuell) continue;
    o.letzteBesetzung[r] = aktuell;
    const betroffene = BEREICHE.filter((b) => b.ressort === r);
    if (!aktuell) {
      for (const b of betroffene) neueVorlage(s, { bereich:b.id, titel:b.name + ': Entscheidung ohne ' + r.toUpperCase(),
        text:'Die Bereichsleitung legt ihren Personal- und Kapazitätsvorschlag direkt dem CEO vor.',frist:3 });
    } else {
      // Beim Rückkehr des Vorstands werden offene Einzelvorlagen der Vakanz gebündelt.
      const einzelfrist = ': Entscheidung ohne ' + r.toUpperCase();
      const zuvor = s.entscheidungen.length;
      s.entscheidungen = s.entscheidungen.filter((e) =>
        !(e.typ === 'organisation_vorlage' && e.titel.endsWith(einzelfrist)));
      const gebuendelt = zuvor - s.entscheidungen.length;
      neueVorlage(s, { bereich:betroffene[0]?.id, titel:r.toUpperCase() + ': Vorlagen gebündelt',
        text:betroffene.length + ' Bereiche berichten wieder an den Ressortvorstand; ' +
          gebuendelt + ' Einzelvorlagen übernommen.',grundsaetzlich:true,frist:3 });
    }
  }
}
export function organisationUebersicht(s: GameState) {
  const o=s.organisation;
  return {
    bereiche:BEREICHE.map((b) => ({ ...b, stelle:o?.bereiche[b.id], qualitaet:bereichsQualitaet(s,b.id),
      berichtetAn:berichtetAn(s,b.id), delegiert:istDelegiert(s,b.id),
      aufgaben: delegationsAufgaben(b.id).map((d) => ({ ...d, an: istAufgabeDelegiert(s,d.id,b.id), grenze: delegationsGrenze(s,d.id,b.id) })),
      hqStufe:s.hq.abteilungen.find((a)=>a.id===b.abteilung)?.stufe??0,
      offen:s.entscheidungen.filter((e)=>e.typ==='organisation_vorlage'&&e.daten.bereich===b.id).length })),
    ressorts:Object.keys(RESSORT_INFO).filter((r)=>r!=='cro').map((r)=>({ id:r,
      name:RESSORT_INFO[r as RessortId].titel, person:s.vorstand.ressorts[r as RessortId].person })),
    regionen:REGIONEN.map((r)=>({ id:r, stelle:o?.regionalleitungen[r],
      cluster:(o?.hauscluster.filter((c)=>c.region===r)??[]).map((c)=>({ ...c,
        anzahl:c.hausIds.length, umsatz:c.hausIds.reduce((a,id)=>a+(s.haeuser.find((h)=>h.id===id)?.kpi?.umsatz??0),0),
        qualitaet:clusterleitungQualitaet(s,c.id), berichtetAn:clusterBerichtetAn(s,c.id),
        aufgaben: delegationsAufgaben(undefined,c.id).map((d)=>({ ...d, an:istAufgabeDelegiert(s,d.id,undefined,c.id), grenze:delegationsGrenze(s,d.id,undefined,c.id) })),
        offen:s.entscheidungen.filter((e)=>e.typ==='organisation_vorlage'&&e.daten.hauscluster===c.id).length })) })),
    sonder:(()=>{const c=o?.hauscluster.find((c)=>c.sonder);return c ? { ...c, aufgaben:delegationsAufgaben(undefined,c.id).map((d)=>({ ...d,an:istAufgabeDelegiert(s,d.id,undefined,c.id),grenze:delegationsGrenze(s,d.id,undefined,c.id) })) } : undefined})(),
    flagships:o?.flagships??[],
  };
}

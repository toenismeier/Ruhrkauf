// O07 Haus als Betrieb: eigene Zustände, Aktionen und Abfragen ohne Abhängigkeit von O01/O02.
import type { GameState, Haus, HausKpi, Filialleiter } from './types';
import { clamp, eur, melde, neueId } from './util';

export type HausStaerke = 'personal' | 'ware' | 'kunde' | 'kosten';
export type KostenPosten = 'energie' | 'reinigung' | 'sicherheit' | 'instandhaltung' | 'versicherung';
export type HausService = 'kundendienst' | 'schneiderei' | 'geschenkverpackung' | 'abholstation';
export type HausGrund = 'wetter' | 'baustelle' | 'ware' | 'personal' | 'konkurrenz' | 'kasse' | 'stadtereignis' | 'sonstiges';
export type HausMassnahme = 'aktion' | 'springer' | 'umlagerung' | 'oeffnungszeit';

export interface HausStandard {
  oeffnung: { von: number; bis: number; samstagBis: number };
  sauberkeit: 1 | 2 | 3;
  praesentation: 1 | 2 | 3;
  kasse: 1 | 2 | 3;
  services?: Record<HausService, boolean>;
}
export interface HausKommentar {
  woche: number; abweichung: number; vergleich: 'vorjahr' | 'plan';
  grund: HausGrund; wahrerGrund: HausGrund; massnahme: HausMassnahme;
  plausibel: boolean; pruefung: string;
}
export interface HausBetrieb {
  leitungStart: number;
  leitungGehaltStart: number;
  ausfallBis?: number;
  inventurdifferenz?: number;
  kosten: Record<KostenPosten, number>;
  services: Record<HausService, boolean>;
  serviceAusnahme?: Partial<Record<HausService, boolean>>;
  standardAusnahme?: HausStandard;
  ausnahmeGrund?: string;
  kundenScore: number;
  scoreWoche: number;
  umsatzHistorie: { woche: number; umsatz: number }[];
  kommentare: HausKommentar[];
  massnahmeBis: number;
  massnahmeFaktor: number;
  gastro: 'keine' | 'selbst' | 'pacht';
  gastroVertragBis: number;
  restaurantQm: number;
  konzessionen: Record<string, { name: string; quote: number; bis: number; exklusiv: boolean }>;
}
export interface StadtUmfeld {
  trend: number;
  ereignis?: 'stadtfest' | 'baustelle' | 'parkhaus' | 'oepnv';
  ereignisBis: number;
  sonntage: number[];
}
export interface HausbetriebStand {
  standards: Record<string, HausStandard>;
  staedte: Record<string, StadtUmfeld>;
  energiePreis?: number;
  energieBis?: number;
  befoerderungen: { haus: string; cluster: string; name: string; qualitaet: number; woche: number }[];
}
export type HausAktion =
  | { typ: 'hausLeitungErsetzen'; haus: string; kandidat: number }
  | { typ: 'hausLeitungFoerdern'; haus: string; staerke: HausStaerke }
  | { typ: 'hausHaltepraemie'; haus: string; betrag: number }
  | { typ: 'hausLeitungBefordern'; haus: string }
  | { typ: 'hausStandardSetzen'; cluster: string; feld: 'sauberkeit' | 'praesentation' | 'kasse' | 'von' | 'bis' | 'samstagBis'; wert: number; haus?: string; begruendung?: string }
  | { typ: 'hausKostenSetzen'; haus: string; posten: KostenPosten; faktor: number }
  | { typ: 'hausServiceSetzen'; haus: string; service: HausService; an: boolean }
  | { typ: 'hausClusterServiceSetzen'; cluster: string; service: HausService; an: boolean }
  | { typ: 'hausGastronomie'; haus: string; modus: 'selbst' | 'pacht' }
  | { typ: 'hausKonzession'; haus: string; flaeche: string; quote: number; laufzeit: number; exklusiv: boolean }
  | { typ: 'hausMassnahme'; haus: string; massnahme: HausMassnahme }
  | { typ: 'hausSonntag'; stadt: string; woche: number };

export const HAUS_AKTIONEN = new Set<HausAktion['typ']>([
  'hausLeitungErsetzen', 'hausLeitungFoerdern', 'hausHaltepraemie', 'hausLeitungBefordern',
  'hausStandardSetzen', 'hausKostenSetzen', 'hausServiceSetzen', 'hausClusterServiceSetzen', 'hausGastronomie',
  'hausKonzession', 'hausMassnahme', 'hausSonntag',
]);
const POSTEN: KostenPosten[] = ['energie', 'reinigung', 'sicherheit', 'instandhaltung', 'versicherung'];
const ANTEILE: Record<KostenPosten, number> = { energie: 0.35, reinigung: 0.2, sicherheit: 0.15, instandhaltung: 0.2, versicherung: 0.1 };
const STANDARD: HausStandard = { oeffnung: { von: 10, bis: 20, samstagBis: 20 }, sauberkeit: 2, praesentation: 2, kasse: 2,
  services: { kundendienst: false, schneiderei: false, geschenkverpackung: false, abholstation: false } };
const NAME = ['Mara Berg', 'Jonas Ritter', 'Elin Werner', 'Timo Falk', 'Nora Lind', 'Lea Böttcher'];
const MASSNAHME: Record<HausGrund, HausMassnahme> = {
  wetter: 'oeffnungszeit', baustelle: 'aktion', ware: 'umlagerung', personal: 'springer',
  konkurrenz: 'aktion', kasse: 'springer', stadtereignis: 'oeffnungszeit', sonstiges: 'aktion',
};
const GRUND_TEXT: Record<HausGrund, string> = {
  wetter: 'Wetter', baustelle: 'Baustelle vor dem Haus', ware: 'Warenverfügbarkeit',
  personal: 'Personaldeckung', konkurrenz: 'Konkurrenzaktion', kasse: 'Kassenausfall',
  stadtereignis: 'Stadtereignis', sonstiges: 'Sonstiges',
};
export { GRUND_TEXT };

function hash(t: string): number {
  let n = 2166136261;
  for (let i = 0; i < t.length; i++) n = Math.imul(n ^ t.charCodeAt(i), 16777619);
  return (n >>> 0) / 4294967296;
}
const leitung = (h: Haus): Filialleiter => h.personal.filialleiter;
const betrieb = (h: Haus): HausBetrieb | undefined => h.betrieb;
const istOffen = (h: Haus): boolean => h.status === 'offen' || h.status === 'schliessung_verhandlung';
export function hausclusterSchluessel(h: Haus): string {
  return h.klasse === 'premium' || h.flagship ? 'premium-flagships' : String(h.hauscluster ?? h.region);
}
/** O01-kompatibel: ein vom CSO als Flagship gesetztes Haus verlässt den Steuerungscluster. */
function steuerungscluster(s: GameState, h: Haus): string {
  const mitOrganisation = s as GameState & { organisation?: { flagships: string[] } };
  return mitOrganisation.organisation?.flagships.includes(h.id) ? 'premium-flagships' : hausclusterSchluessel(h);
}
export function hausStandard(s: GameState, h: Haus): HausStandard {
  return betrieb(h)?.standardAusnahme ?? s.hausbetrieb?.standards[steuerungscluster(s,h)] ?? STANDARD;
}
/** Servicevorgaben des Hausclusters plus ausdrücklich gesetzte Ausnahmen vor Ort. */
export function hausServices(s: GameState, h: Haus): Record<HausService, boolean> {
  const b = h.betrieb, standard = hausStandard(s,h);
  return Object.fromEntries((['kundendienst','schneiderei','geschenkverpackung','abholstation'] as HausService[]).map(key =>
    [key,b?.serviceAusnahme?.[key] ?? (b?.services[key] || standard.services?.[key] || false)]
  )) as Record<HausService,boolean>;
}
export function hausKandidaten(s: GameState, hausId: string) {
  const h = s.haeuser.find(x => x.id === hausId);
  if (!h) return [];
  return [0, 1, 2].map(i => {
    const x = hash(s.seed + ':' + hausId + ':kandidat:' + i + ':' + Math.floor(s.woche / 13));
    const staerken = { personal: 0.4 + 0.5 * x, ware: 0.4 + 0.5 * hash(hausId+'w'+i), kunde: 0.4 + 0.5 * hash(hausId+'k'+i), kosten: 0.4 + 0.5 * hash(hausId+'c'+i) };
    return { name: NAME[Math.floor(x * NAME.length)], staerken, ehrlichkeit: 0.4 + 0.6 * hash(hausId+'e'+i),
      gehalt: eur(85_000 + 85_000 * x), qualitaet: (staerken.personal + staerken.ware + staerken.kunde + staerken.kosten) / 4 };
  });
}

/** Alte Spielstände werden ohne neue Zufallsziehungen migriert. */
export function initialisiereHausbetrieb(s: GameState): void {
  s.hausbetrieb ??= { standards: {}, staedte: {}, befoerderungen: [] };
  s.hausbetrieb.standards['premium-flagships'] ??= structuredStandard();
  for (const h of s.haeuser) {
    s.hausbetrieb.standards[steuerungscluster(s,h)] ??= structuredStandard();
    s.hausbetrieb.staedte[h.stadt] ??= { trend: 1, ereignisBis: 0, sonntage: [] };
    const l = leitung(h);
    l.staerken ??= { personal: l.skill, ware: l.skill, kunde: l.skill, kosten: l.skill };
    l.ehrlichkeit ??= 0.35 + 0.6 * hash(s.seed + ':' + h.id + ':ehrlich');
    l.gehalt ??= eur(70_000 + 100_000 * l.skill);
    l.bonusAnteil ??= 0.1;
    l.wechselwille ??= 0;
    l.stellvertretung ??= { name: 'Stellvertretung ' + h.stadt, qualitaet: clamp(l.skill * 0.85, 0, 1) };
    h.betrieb ??= {
      leitungStart: l.skill, leitungGehaltStart: l.gehalt ?? 0, kosten: { energie: 1, reinigung: 1, sicherheit: 1, instandhaltung: 1, versicherung: 1 },
      services: { kundendienst: false, schneiderei: false, geschenkverpackung: false, abholstation: false },
      kundenScore: 0, scoreWoche: -1, umsatzHistorie: [], kommentare: [],
      massnahmeBis: 0, massnahmeFaktor: 1, gastro: 'keine', gastroVertragBis: 0,
      restaurantQm: h.format === 'warenhaus' && h.etagen.length >= 4 ? Math.min(350, Math.round(h.grundflaecheQm * 0.06)) : 0,
      konzessionen: {},
    };
    h.betrieb.leitungGehaltStart ??= l.gehalt ?? 0;
    for (const f of h.flaechen.filter(x => x.konzept === 'konzession')) {
      h.betrieb.konzessionen[f.id] ??= { name: 'Partner ' + (f.gruppe ?? 'Sortiment'), quote: 0.22, bis: s.woche + 260, exklusiv: false };
    }
  }
}
function structuredStandard(): HausStandard {
  return { oeffnung: { ...STANDARD.oeffnung }, sauberkeit: 2, praesentation: 2, kasse: 2,
    services: { kundendienst: false, schneiderei: false, geschenkverpackung: false, abholstation: false } };
}
function stadtFaktor(s: GameState, h: Haus): number {
  const u = s.hausbetrieb?.staedte[h.stadt];
  if (!u) return 1;
  let f = u.trend;
  if (u.ereignisBis > s.woche) f *= u.ereignis === 'stadtfest' ? 1.07 : u.ereignis === 'baustelle' ? 0.9 : u.ereignis === 'parkhaus' ? 0.93 : u.ereignis === 'oepnv' ? 0.85 : 1;
  if (u.sonntage.includes(s.woche)) f *= 1.12;
  return f;
}

/** Eingriffe an Frequenz/Kaufquote werden mit Faktor 1 gestartet. */
export function hausBetriebsFaktor(s: GameState, h: Haus): number {
  const b = betrieb(h);
  if (s.hausbetriebAbnahmeAus || !b || !istOffen(h)) return 1;
  const l = leitung(h);
  const st = hausStandard(s, h);
  const services = hausServices(s,h);
  const kundendienst = services.kundendienst ? 1.007 : 1;
  const schneiderei = services.schneiderei ? 1.004 : 1;
  const geschenk = services.geschenkverpackung && (s.woche % 52 >= 47) ? 1.014 : 1;
  const abholung = services.abholstation ? 1.005 : 1;
  const standard = 1 + 0.007 * (st.sauberkeit - 2) + 0.009 * (st.praesentation - 2) + 0.006 * (st.kasse - 2)
    + 0.002 * (10 - st.oeffnung.von) + 0.003 * (st.oeffnung.bis - 20) + 0.002 * (st.oeffnung.samstagBis - 20);
  // Der alte skill-Faktor bleibt in wirtschaft.ts: nur Änderungen an den vier neuen Stärken wirken zusätzlich.
  const delta = (l.staerken?.kunde ?? l.skill) - b.leitungStart;
  const ware = (l.staerken?.ware ?? l.skill) - b.leitungStart;
  return Math.max(0.5, stadtFaktor(s, h) * standard * (1 + 0.06 * delta + 0.035 * ware)
    * kundendienst * schneiderei * geschenk * abholung
    * (b.massnahmeBis > s.woche ? b.massnahmeFaktor : 1)
    * (b.ausfallBis !== undefined && b.ausfallBis > s.woche ? 0.96 : 1)
    * (b.gastro === 'selbst' ? 1.015 : b.gastro === 'pacht' ? 1.006 : 1));
}

export function hausBetriebskosten(s: GameState, h: Haus, sonstige: number): number {
  const b = betrieb(h);
  if (s.hausbetriebAbnahmeAus || !b || !istOffen(h)) return sonstige;
  let faktor = 0;
  const preis = s.hausbetrieb?.energiePreis ?? 1;
  const basisTechnik = h.baujahr < 1970 ? 0 : h.baujahr < 2005 ? 1 : 2;
  // O08 Umbau: modernisierte LED- und Klimastufen senken den Energieverbrauch, der Start ist neutral.
  const etagenBau = (h as Haus & {etagenBau?: Record<string, {technik:{licht:number;klima:number}}>}).etagenBau;
  const modernisiert = etagenBau ? Object.values(etagenBau).reduce((sum,e)=>sum+Math.max(0,e.technik.licht-basisTechnik)+Math.max(0,e.technik.klima-basisTechnik),0) / Math.max(1,h.etagen.length) : 0;
  for (const p of POSTEN) faktor += ANTEILE[p] * b.kosten[p] * (p === 'energie' ? preis * (1 - 0.07 * modernisiert) : 1);
  const service = Object.values(hausServices(s,h)).filter(Boolean).length * 180;
  const l = leitung(h);
  const kostenLeitung = 1 - 0.035 * ((l.staerken?.kosten ?? l.skill) - b.leitungStart);
  return Math.max(0, sonstige * faktor * kostenLeitung + service);
}
export function hausKonzessionserloes(s: GameState, h: Haus, umsatz: number, quoteBasis: number): number {
  const fl = h.flaechen.filter(f => f.konzept === 'konzession');
  if (s.hausbetriebAbnahmeAus || !fl.length || !h.betrieb) return umsatz * quoteBasis;
  const qm = fl.reduce((v, f) => v + f.qm, 0) || 1;
  const quote = fl.reduce((v, f) => v + f.qm / qm * (h.betrieb?.konzessionen[f.id]?.quote ?? quoteBasis), 0);
  return umsatz * quote;
}
export function hausGastroErgebnis(s: GameState, h: Haus, umsatzBasis: number) {
  const b = betrieb(h);
  if (s.hausbetriebAbnahmeAus || !b || b.gastro === 'keine' || b.restaurantQm <= 0 || !istOffen(h)) return { umsatz: 0, rohertrag: 0, personal: 0, sonstige: 0, pacht: 0 };
  const wochenUmsatz = eur(Math.max(0, umsatzBasis) * 0.012 + b.restaurantQm * 32);
  if (b.gastro === 'pacht') return { umsatz: 0, rohertrag: 0, personal: 0, sonstige: 0, pacht: eur(wochenUmsatz * 0.115) };
  return { umsatz: wochenUmsatz, rohertrag: eur(wochenUmsatz * 0.6),
    personal: eur(wochenUmsatz * 0.37), sonstige: eur(wochenUmsatz * 0.13), pacht: 0 };
}
export function hausKundenscore(s: GameState, h: Haus): number {
  const b = betrieb(h);
  if (!b) return 60;
  const st = hausStandard(s, h), k = h.kpi;
  const personal = k && k.fteBedarf > 0 ? clamp(k.fteIst / k.fteBedarf, 0, 1.1) : 1;
  const reinigung = clamp(b.kosten.reinigung, 0, 1.3);
  const verfuegbarkeit = (leitung(h).staerken?.ware ?? leitung(h).skill) - b.leitungStart;
  const score = 64 + 7 * (st.sauberkeit - 2) + 5 * (st.praesentation - 2) + 4 * (st.kasse - 2)
    + 14 * (personal - 1) + 22 * (reinigung - 1) + 8 * verfuegbarkeit + 0.13 * (h.substanz - 60)
    + Object.values(hausServices(s,h)).filter(Boolean).length * 2;
  return Math.round(clamp(score, 0, 100));
}

function realerGrund(s: GameState, h: Haus): HausGrund {
  const u = s.hausbetrieb?.staedte[h.stadt];
  if (u?.ereignisBis && u.ereignisBis > s.woche) {
    if (u.ereignis === 'baustelle' || u.ereignis === 'parkhaus') return 'baustelle';
    if (u.ereignis === 'oepnv' || u.ereignis === 'stadtfest') return 'stadtereignis';
  }
  const b = h.betrieb;
  if (h.kpi && h.kpi.fteBedarf > 0 && h.kpi.fteIst / h.kpi.fteBedarf < 0.94) return 'personal';
  if (b && (leitung(h).staerken?.ware ?? leitung(h).skill) < b.leitungStart - 0.03) return 'ware';
  if (s.wettbewerber.some(w => w.stadt === h.stadt && w.status === 'offen' && w.aktionBis !== undefined && w.aktionBis > s.woche)) return 'konkurrenz';
  return 'sonstiges';
}
function pruefeKommentar(s: GameState, h: Haus, wahr: HausGrund, gemeldet: HausGrund) {
  const q = s.controllingStufe === 2 ? 0.95 : s.controllingStufe === 1 ? 0.62 : 0.28;
  const erkannt = wahr !== gemeldet && hash(s.seed+':prüfung:'+h.id+':'+s.woche) < q;
  return { plausibel: !erkannt, pruefung: erkannt ? 'Nicht plausibel, eigentlicher Treiber: ' + GRUND_TEXT[wahr] : 'Plausibel' };
}
function stelleKommentar(s: GameState, h: Haus, vergleich: 'vorjahr' | 'plan', delta: number) {
  if (!h.betrieb || s.prognose) return;
  const wahr = realerGrund(s, h);
  const ehrlich = hash(s.seed+':ehrlichkeit:'+h.id+':'+s.woche) < (leitung(h).ehrlichkeit ?? 1);
  const grund: HausGrund = ehrlich || !['ware', 'personal', 'kasse'].includes(wahr)
    ? wahr : hash(h.id+':ausrede:'+s.woche) < 0.5 ? 'wetter' : 'baustelle';
  const massnahme = MASSNAHME[grund];
  const pruefung = pruefeKommentar(s, h, wahr, grund);
  h.betrieb.kommentare.unshift({ woche: s.woche, abweichung: delta, vergleich, grund, wahrerGrund: wahr, massnahme, ...pruefung });
  h.betrieb.kommentare.length = Math.min(h.betrieb.kommentare.length, 26);
  // Clusterleitung setzt ihre Routineempfehlung um. O01 kann hier die Qualität übersteuern.
  const organisation = (s as GameState & { organisation?: { hauscluster: { id:string; stelle:{ person?:{ qualitaet:number } } }[] } }).organisation;
  const qualitaet = clamp(organisation?.hauscluster.find(x => x.id === steuerungscluster(s,h))?.stelle.person?.qualitaet ?? h.clusterleitungQualitaet ?? 0.55, 0, 1);
  if (hash(s.seed+':massnahme:'+h.id+':'+s.woche) < qualitaet) {
    h.betrieb.massnahmeBis = s.woche + 3;
    h.betrieb.massnahmeFaktor = 1 + 0.006 + 0.008 * qualitaet;
  }
}

/** Ein Aufruf vor jeder Woche, ohne zusätzliche Ziehungen aus s.rng. */
export function hausWoche(s: GameState): void {
  if (!s.hausbetrieb) initialisiereHausbetrieb(s);
  hausAbschluss(s);
  if (s.prognose || s.hausbetriebAbnahmeAus) return;
  if ((s.hausbetrieb!.energieBis ?? 0) <= s.woche) s.hausbetrieb!.energiePreis = 1;
  // Die Ausgangslage im ersten Geschäftsjahr bleibt exakt unverändert.
  if (s.woche >= 52 && s.woche % 13 === 0) {
    const stand = s.hausbetrieb!;
    if ((stand.energieBis ?? 0) <= s.woche) stand.energiePreis = 1;
    if (hash(s.seed + ':energie:' + s.woche) < 0.12) {
      stand.energiePreis = hash(s.seed + ':energiehoehe:' + s.woche) < 0.5 ? 0.8 : 1.2;
      stand.energieBis = s.woche + 8;
      melde(s, 'ereignis', 'Energiepreisänderung im Filialnetz: ' + Math.round((stand.energiePreis - 1) * 100) + ' % für acht Wochen.', { modul: 'haus' });
    }
  }
  if (s.woche >= 52) for (const [stadt, u] of Object.entries(s.hausbetrieb!.staedte)) {
    if (u.ereignisBis <= s.woche) {
      u.ereignis = undefined;
      if (hash(s.seed+':stadt:'+stadt+':'+s.woche) < 0.0018) {
        const typ = ['stadtfest', 'baustelle', 'parkhaus', 'oepnv'] as const;
        u.ereignis = typ[Math.floor(hash(stadt+':art:'+s.woche) * typ.length)];
        u.ereignisBis = s.woche + 1 + (u.ereignis === 'baustelle' ? 4 + Math.floor(hash(stadt+':dauer:'+s.woche) * 17) : 1);
        melde(s, 'ereignis', stadt + ': ' + ({stadtfest:'Stadtfest',baustelle:'Baustelle vor dem Haus',parkhaus:'Parkhaus geschlossen',oepnv:'ÖPNV-Streik'}[u.ereignis]) + '.', { stadt, modul: 'haus' });
      }
    }
    // Stadtfrequenz driftet langfristig gering und deterministisch.
    if (s.woche % 52 === 0) u.trend = clamp(u.trend + (hash(s.seed+stadt+':trend:'+s.woche) - 0.5) * 0.01, 0.9, 1.1);
    u.sonntage = u.sonntage.filter(w => Math.floor(w / 52) >= Math.floor(s.woche / 52));
  }
  for (const h of s.haeuser) {
    if (!istOffen(h) || !h.betrieb) continue;
    const b = h.betrieb;
    if (s.woche % 13 === 0 && s.woche !== 0) { b.kundenScore = hausKundenscore(s, h); b.scoreWoche = s.woche; }
    const delta = (h.personal.filialleiter.staerken?.personal ?? h.personal.filialleiter.skill) - b.leitungStart;
    h.personal.filialleiter.wechselwille = clamp((h.personal.filialleiter.wechselwille ?? 0) + Math.max(0, 45 - h.personal.filialleiter.moral) / 500 - Math.max(0, delta) * 0.01, 0, 1);
    if (b.kosten.instandhaltung < 0.75 && s.woche % 13 === 0) {
      h.substanz = clamp(h.substanz - (0.75 - b.kosten.instandhaltung) * 4, 0, 100);
      if (hash(s.seed + ':ausfall:' + h.id + ':' + s.woche) < (0.75 - b.kosten.instandhaltung) * 0.6) {
        b.ausfallBis = s.woche + 3;
        melde(s, 'warnung', h.name + ': Rolltreppe oder Aufzug ausgefallen, Reparatur dauert drei Wochen.', { hausId: h.id, stadt: h.stadt });
      }
    }
    if (b.kosten.sicherheit < 0.75 && s.woche % 13 === 0) {
      b.inventurdifferenz = (b.inventurdifferenz ?? 0) + (0.75 - b.kosten.sicherheit) * 0.002;
      melde(s, 'warnung', h.name + ': erhöhte Inventurdifferenz durch geringere Sicherheitsdeckung.', { hausId: h.id, stadt: h.stadt });
    }
    // O07: Neue fiktive Marken- und Servicekonzessionen als echte Entscheidung.
    // Keine Standardakzeptanz; Platzierung ist nach Spielerentscheidung wirksam.
    if (s.woche >= 52 && s.woche % 13 === 0 && hash(s.seed+':partner:'+h.id+':'+s.woche) < 0.003) {
      const f = h.flaechen.find(x => x.konzept === 'eigen' && x.qm >= 400 && ['accessoires','beauty','herren','damen'].includes(x.gruppe ?? ''));
      if (f) {
        const anbieter = ['Optikhaus Lind', 'Uhrenatelier Merten', 'Markenstudio Falk'][Math.floor(hash(h.id+':anbieter:'+s.woche)*3)];
        s.entscheidungen.push({ id: neueId(s,'e'), typ:'haus_konzession_neu', woche:s.woche, frist:s.woche+8,
          titel: 'Konzessionsangebot für ' + h.name,
          text: anbieter + ' bietet eine Konzession über 180 qm mit 22 % Umsatzmiete für fünf Jahre. Vertragsabschluss reduziert die eigene Verkaufsfläche.',
          optionen:[{id:'annehmen',label:'Konzession abschließen'},{id:'ablehnen',label:'Ablehnen'}],
          standard:'ablehnen', daten:{haus:h.id, flaeche:f.id, partner:anbieter, qm:180, quote:0.22} });
      }
    }
    // O07: dezentrale Jahresgespräche, im Posteingang nach Qualität der Clusterleitung gebündelt.
    if (s.woche >= 52 && s.woche % 52 === 0 && hash(s.seed+':jahresgespraech:'+h.id+':'+s.woche) < 0.025) {
      const l=h.personal.filialleiter;
      s.entscheidungen.push({ id:neueId(s,'e'), typ:'haus_jahresgespraech', woche:s.woche, frist:s.woche+6,
        titel:'Jahresgespräch: '+l.name+' ('+h.name+')',
        text:'Stärken und Stimmung der Hausleitung: Personal '+Math.round((l.staerken?.personal??l.skill)*100)+' %, Ware '+Math.round((l.staerken?.ware??l.skill)*100)+' %, Kunde '+Math.round((l.staerken?.kunde??l.skill)*100)+' %, Kosten '+Math.round((l.staerken?.kosten??l.skill)*100)+' %. Wechselwille '+Math.round((l.wechselwille??0)*100)+' %.',
        optionen:[{id:'coaching',label:'Persönliches Coaching (8.000 €)'},{id:'praemie',label:'Jahresbonus (10.000 €)'},{id:'beobachten',label:'Leistung beobachten'}],
        standard:'beobachten', daten:{haus:h.id} });
    }
    for (const [id, v] of Object.entries(b.konzessionen)) if (s.woche === v.bis - 8) {
      s.entscheidungen.push({ id: neueId(s, 'e'), typ: 'haus_konzession', woche: s.woche, frist: s.woche + 6,
        titel: 'Konzession ' + h.name, text: 'Vertrag mit ' + v.name + ' endet. Anschlussmiete verhandeln?',
        optionen: [{ id:'verlaengern',label:'Zu bisherigen Konditionen verlängern' },{id:'neu',label:'Neu verhandeln' }],
        standard: 'verlaengern', daten: { haus: h.id, flaeche: id } });
    }
  }
}
/** Ein Aufruf nach der Berechnung aller Haus-KPIs. */
export function hausAbschluss(s: GameState): void {
  if (!s.hausbetrieb || s.prognose || s.hausbetriebAbnahmeAus) return;
  for (const h of s.haeuser) {
    if (!istOffen(h) || !h.kpi || !h.betrieb) continue;
    const b = h.betrieb, vorher = b.umsatzHistorie.find(x => x.woche === s.woche - 52);
    // O06: Jahresphasing ist die führende Quelle; das optionale Feld ist ein Fallback.
    const geplant = (s as GameState & { planung?: { jahre: { jahr:number; phasing: Record<string,number[]> }[] } }).planung;
    const jahr=s.startJahr+Math.floor(s.woche/52);
    const plan = geplant?.jahre.find(j=>j.jahr===jahr)?.phasing[h.id]?.[s.woche%52] ?? h.wochenPlan;
    const vergleich = vorher ? 'vorjahr' : plan !== undefined ? 'plan' : undefined;
    const referenz = vorher?.umsatz ?? plan;
    if (vergleich && referenz && referenz > 0 && h.kpi.umsatz / referenz < 0.95) stelleKommentar(s, h, vergleich, h.kpi.umsatz / referenz - 1);
    b.umsatzHistorie.push({ woche: s.woche, umsatz: h.kpi.umsatz });
    if (b.umsatzHistorie.length > 105) b.umsatzHistorie.shift();
  }
}
export function loeseHausVorlage(s: GameState, typ: string, daten: Record<string, string | number | boolean>, option: string) {
  const h = s.haeuser.find(x => x.id === daten.haus);
  if (!h || !h.betrieb) return;
  if (typ === 'haus_jahresgespraech') {
    const l = h.personal.filialleiter;
    if (option === 'coaching' && l.staerken) {
      s.einmalkostenWoche += 8_000;
      const schwaechste = (Object.keys(l.staerken) as HausStaerke[]).sort((a,b)=>l.staerken![a]-l.staerken![b])[0];
      l.staerken[schwaechste] = clamp(l.staerken[schwaechste] + 0.055, 0, 1);
      l.skill = Object.values(l.staerken).reduce((a,b)=>a+b,0)/4;
      l.moral = clamp(l.moral + 8, 0, 100);
    } else if (option === 'praemie') {
      s.einmalkostenWoche += 10_000;
      l.moral = clamp(l.moral + 12, 0, 100);
      l.wechselwille = clamp((l.wechselwille ?? 0) - 0.12, 0, 1);
    }
    return;
  }
  if (typ === 'haus_konzession_neu') {
    if (option !== 'annehmen' || h.status !== 'offen') return;
    const alt = h.flaechen.find(f=>f.id===daten.flaeche && f.konzept==='eigen');
    const qm = Number(daten.qm), quote=Number(daten.quote);
    if (!alt || alt.qm < qm + 100 || !Number.isFinite(quote)) return;
    alt.qm -= qm;
    const id = h.id + '-konz-' + neueId(s,'');
    h.flaechen.push({ ...alt, id, qm, konzept:'konzession' });
    h.betrieb.konzessionen[id] = { name:String(daten.partner),quote,bis:s.woche+260,exklusiv:false };
    melde(s, 'info', h.name+': '+String(daten.partner)+' bezieht '+qm+' qm mit Umsatzmiete.', { hausId:h.id, stadt:h.stadt });
    return;
  }
  if (typ !== 'haus_konzession') return;
  const v = h.betrieb.konzessionen[String(daten.flaeche)];
  if (!v) return;
  v.quote = option === 'neu' ? clamp(v.quote + 0.01, 0.1, 0.35) : v.quote;
  v.bis = s.woche + 260;
  melde(s, 'info', h.name + ': Konzessionsvertrag mit ' + v.name + ' verlängert.', { hausId: h.id, stadt: h.stadt });
}

export function hausAktion(s: GameState, a: HausAktion): { ok: boolean; text: string } {
  if (!s.hausbetrieb) initialisiereHausbetrieb(s);
  const h = 'haus' in a ? s.haeuser.find(x => x.id === a.haus) : undefined;
  if ('haus' in a && (!h || !istOffen(h))) return { ok: false, text: 'Haus nicht gefunden oder geschlossen.' };
  const b = h?.betrieb;
  const l = h?.personal.filialleiter;
  switch (a.typ) {
    case 'hausLeitungErsetzen': {
      if (!h || !l || !b) break;
      const k = hausKandidaten(s, h.id)[a.kandidat];
      if (!k) return { ok: false, text: 'Kandidat nicht gefunden.' };
      s.einmalkostenWoche += eur(k.gehalt / 3);
      h.personal.filialleiter = { name: k.name, skill: k.qualitaet, staerken: k.staerken, ehrlichkeit: k.ehrlichkeit,
        gehalt: k.gehalt, bonusAnteil: 0.1, moral: 70, wechselwille: 0, stellvertretung: l.stellvertretung };
      b.leitungStart = l.skill; // Neue Leitung wirkt über die Abweichung zu ihrer Vorgängerin.
      return { ok: true, text: 'Hausleitung ' + k.name + ' eingestellt.' };
    }
    case 'hausLeitungFoerdern':
      if (!l || !l.staerken) break;
      l.staerken[a.staerke] = clamp(l.staerken[a.staerke] + 0.08, 0, 1);
      l.skill = (l.staerken.personal + l.staerken.ware + l.staerken.kunde + l.staerken.kosten) / 4;
      s.einmalkostenWoche += 12_000;
      return { ok: true, text: 'Weiterbildung erfolgreich: ' + a.staerke + ' gestärkt.' };
    case 'hausHaltepraemie':
      if (!l || !Number.isFinite(a.betrag) || a.betrag < 0 || a.betrag > 100_000) break;
      s.einmalkostenWoche += eur(a.betrag);
      l.wechselwille = clamp((l.wechselwille ?? 0) - a.betrag / 100_000, 0, 1);
      l.moral = clamp(l.moral + a.betrag / 10_000, 0, 100);
      return { ok: true, text: 'Halteprämie zugesagt.' };
    case 'hausLeitungBefordern':
      if (!h || !l || !b || l.skill < 0.6) return { ok: false, text: 'Hausleitung benötigt mindestens 60 % Kompetenz.' };
      s.hausbetrieb!.befoerderungen.push({ haus: h.id, cluster: steuerungscluster(s,h), name: l.name, qualitaet: l.skill, woche: s.woche });
      h.personal.filialleiter = { ...l, name: l.stellvertretung?.name ?? 'Interim ' + h.stadt, skill: l.stellvertretung?.qualitaet ?? 0.5,
        staerken: { personal: l.stellvertretung?.qualitaet ?? 0.5, ware: l.stellvertretung?.qualitaet ?? 0.5, kunde: l.stellvertretung?.qualitaet ?? 0.5, kosten: l.stellvertretung?.qualitaet ?? 0.5 } };
      h.personal.filialleiter.wechselwille = 0;
      return { ok: true, text: l.name + ' als Clusterleitungs-Kandidat vorgemerkt. Stellvertretung übernimmt das Haus.' };
    case 'hausStandardSetzen': {
      if (a.haus && !a.begruendung?.trim()) return { ok: false, text: 'Einzelabweichungen benötigen eine Begründung.' };
      if (h && a.cluster !== steuerungscluster(s,h)) return { ok: false, text: 'Haus gehört nicht zum angegebenen Hauscluster.' };
      const basis = h ? hausStandard(s, h) : s.hausbetrieb!.standards[a.cluster];
      if (!basis) return { ok: false, text: 'Hauscluster nicht gefunden.' };
      const n = Number(a.wert);
      if (!Number.isInteger(n)) break;
      const stand: HausStandard = { ...basis, oeffnung: { ...basis.oeffnung } };
      if (a.feld === 'von' || a.feld === 'bis' || a.feld === 'samstagBis') {
        if (n < 7 || n > 22) break;
        stand.oeffnung[a.feld] = n;
        if (stand.oeffnung.von >= stand.oeffnung.bis || stand.oeffnung.von >= stand.oeffnung.samstagBis) break;
      } else {
        if (n < 1 || n > 3) break;
        stand[a.feld] = n as 1 | 2 | 3;
      }
      if (h) {
        h.betrieb!.standardAusnahme = stand;
        h.betrieb!.ausnahmeGrund = a.begruendung!.trim();
      } else s.hausbetrieb!.standards[a.cluster] = stand;
      return { ok: true, text: 'Hausstandard angepasst.' };
    }
    case 'hausKostenSetzen':
      if (!b || !POSTEN.includes(a.posten) || !Number.isFinite(a.faktor) || a.faktor < 0.45 || a.faktor > 1.5) break;
      b.kosten[a.posten] = Math.round(a.faktor * 100) / 100;
      return { ok: true, text: 'Betriebskosten ' + a.posten + ' angepasst.' };
    case 'hausServiceSetzen':
      if (!b || !(a.service in b.services)) break;
      (b.serviceAusnahme ??= {})[a.service] = a.an;
      return { ok: true, text: 'Hausausnahme für Service ' + a.service + (a.an ? ' aktiviert.' : ' deaktiviert.') };
    case 'hausClusterServiceSetzen': {
      const stand = s.hausbetrieb!.standards[a.cluster];
      if (!stand || !['kundendienst','schneiderei','geschenkverpackung','abholstation'].includes(a.service)) break;
      (stand.services ??= { kundendienst:false, schneiderei:false, geschenkverpackung:false, abholstation:false })[a.service] = a.an;
      return { ok: true, text: 'Service-Standard des Hausclusters geändert.' };
    }
    case 'hausGastronomie':
      if (!b || b.restaurantQm <= 0) return { ok: false, text: 'Keine Restaurantfläche vorhanden.' };
      if (b.gastro !== 'keine' && b.gastroVertragBis > s.woche) return { ok: false, text: 'Wechsel erst zum Vertragsende möglich.' };
      b.gastro = a.modus;
      b.gastroVertragBis = s.woche + 104;
      s.einmalkostenWoche += b.restaurantQm * (a.modus === 'selbst' ? 520 : 100);
      return { ok: true, text: 'Gastronomie wird ' + (a.modus === 'selbst' ? 'selbst betrieben.' : 'verpachtet.') };
    case 'hausKonzession': {
      if (!h || !b || !Number.isFinite(a.quote) || a.quote < 0.1 || a.quote > 0.35 || !Number.isInteger(a.laufzeit) || a.laufzeit < 26 || a.laufzeit > 520) break;
      const f = h.flaechen.find(x => x.id === a.flaeche && x.konzept === 'konzession');
      if (!f) return { ok: false, text: 'Keine Konzessionsfläche.' };
      const bisher = b.konzessionen[f.id];
      if (bisher && bisher.bis > s.woche) return { ok: false, text: 'Vertrag läuft noch.' };
      b.konzessionen[f.id] = { name: bisher?.name ?? 'Partner ' + (f.gruppe ?? ''), quote: a.quote, bis: s.woche + a.laufzeit, exklusiv: a.exklusiv };
      return { ok: true, text: 'Konzessionsvertrag abgeschlossen.' };
    }
    case 'hausMassnahme':
      if (!b) break;
      b.massnahmeBis = s.woche + 4;
      b.massnahmeFaktor = 1.012;
      s.einmalkostenWoche += 5_000;
      return { ok: true, text: 'Ad-hoc-Maßnahme für vier Wochen eingeleitet.' };
    case 'hausSonntag': {
      const u = s.hausbetrieb!.staedte[a.stadt];
      if (!u || !Number.isInteger(a.woche) || a.woche < s.woche + 2 || a.woche >= s.woche + 52) break;
      const jahr = Math.floor(a.woche / 52);
      if (u.sonntage.includes(a.woche)) return { ok: false, text: 'Für diese Woche wurde bereits ein Sonntag genehmigt.' };
      if (u.sonntage.filter(w => Math.floor(w / 52) === jahr).length >= 4) return { ok: false, text: 'Höchstens vier Sonntage pro Jahr.' };
      const groesse = s.haeuser.find(x => x.stadt === a.stadt)?.cluster;
      const p = groesse === 'metropole' ? 0.65 : groesse === 'grossstadt' ? 0.78 : 0.86;
      const genehmigt = hash(s.seed + ':sonntag:' + a.stadt + ':' + a.woche) < p;
      if (genehmigt) u.sonntage.push(a.woche);
      s.stakeholder.betriebsrat = clamp(s.stakeholder.betriebsrat - 2, 0, 100);
      melde(s, 'info', a.stadt + ': Antrag auf verkaufsoffenen Sonntag ' + (genehmigt ? 'genehmigt.' : 'abgelehnt. Gegenwind von Gewerkschaft und Kirche.'), { stadt: a.stadt, modul: 'haus' });
      return { ok: true, text: genehmigt ? 'Sonntag genehmigt.' : 'Sonntag nicht genehmigt.' };
    }
  }
  return { ok: false, text: 'Ungültige Hausaktion.' };
}

export function hausUebersicht(s: GameState, id: string) {
  const h = s.haeuser.find(x => x.id === id);
  if (!h) return undefined;
  const b = h.betrieb, l = h.personal.filialleiter;
  return {
    id: h.id, name: h.name, hauscluster: steuerungscluster(s,h), stadtgroesse: h.cluster,
    standard: hausStandard(s, h), leitungsdaten: l, kandidaten: hausKandidaten(s, id),
    kundenScore: hausKundenscore(s, h), letzteMessung: b?.scoreWoche,
    kosten: b?.kosten, ausfallBis:b?.ausfallBis, inventurdifferenz:b?.inventurdifferenz ?? 0, energiePreis:s.hausbetrieb?.energiePreis ?? 1,
    planWoche:(s as GameState & {planung?: {jahre:{jahr:number;phasing:Record<string,number[]>}[]}}).planung?.jahre.find(j=>j.jahr===s.startJahr+Math.floor(s.woche/52))?.phasing[h.id]?.[s.woche%52] ?? h.wochenPlan,
    treiberAktuell:(h as Haus & {treiberVerlauf?:{von:number;bis:number;frequenz:number;kaufquote:number;bon:number}[]}).treiberVerlauf?.slice().reverse().find(x=>x.bis===s.woche-1),
    kostenBasis: eur((h.kpi?.sonstige ?? 0) / Math.max(0.001, b ? Object.entries(b.kosten).reduce((a, [p, f]) => a + ANTEILE[p as KostenPosten] * f, 0) : 1)),
    services: hausServices(s,h), gastro: b?.gastro, gastroVertragBis: b?.gastroVertragBis, restaurantQm: b?.restaurantQm,
    konzessionen: b?.konzessionen, kommentar: b?.kommentare[0], kommentare: b?.kommentare ?? [],
    umfeld: s.hausbetrieb?.staedte[h.stadt], ausnahmeGrund: b?.ausnahmeGrund,
    flaechen: h.flaechen.filter(f => f.konzept === 'konzession' || f.konzept === 'untermiete'),
  };
}
export function hausBeobachtung(s: GameState, limit = 30) {
  return s.haeuser.filter(h => istOffen(h) && h.kpi).map(h => {
    const b = h.betrieb, c = b?.kommentare[0], score = hausKundenscore(s, h);
    let grund = '';
    let gewicht = 0;
    if (c && c.woche >= s.woche - 2 && !c.plausibel) { grund = 'Kommentar nicht plausibel'; gewicht = 100; }
    else if ((h.personal.filialleiter.interimBis ?? 0) > s.woche) { grund = 'Hausleitung unbesetzt'; gewicht = 90; }
    else if (score < 50) { grund = 'Kundenscore ' + score + '/100'; gewicht = 70 + (50-score)/10; }
    else if (c && c.woche >= s.woche - 2) { grund = 'Umsatzabweichung ' + (c.abweichung * 100).toFixed(1) + ' %'; gewicht = 50 - c.abweichung * 100; }
    return { id: h.id, name: h.name, stadt: h.stadt, grund, score, gewicht, kommentar: c };
  }).filter(x => x.gewicht > 0).sort((a,b) => b.gewicht - a.gewicht || a.id.localeCompare(b.id)).slice(0, limit);
}
export function hausKommentareDerWoche(s: GameState) {
  return s.haeuser.flatMap(h => (h.betrieb?.kommentare ?? []).filter(c => c.woche === s.woche - 1)
    .map(c => ({ id: h.id, name: h.name, stadt: h.stadt, ...c })));
}
export function hausKundenRanking(s: GameState) {
  return s.haeuser.filter(istOffen).map(h => ({ id: h.id, name: h.name, score: hausKundenscore(s, h) }))
    .sort((a,b) => b.score-a.score || a.id.localeCompare(b.id));
}

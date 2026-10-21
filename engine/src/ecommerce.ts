// O09 E-Commerce: eigener Kanal, finanzielle Neutralität in der Ausgangslage.
// Die Baseline von 8 % ist bereits im stationären Umsatz der bisherigen Engine enthalten.
// O03/O05 werden über optionale Strukturschnittstellen gelesen, solange deren Branches offen sind.
import { GRUPPEN } from './daten';
import type { GameState, GruppeId, Haus, WochenKpi } from './types';
import { clamp, eur, melde } from './util';
import { einmalKosten } from './prozesse';
import { vorstandWirkung } from './vorstand';

export type FulfillmentModell = 'dienstleister' | 'eigen';
export interface FulfillmentProjekt { modell: FulfillmentModell; start: number; bis: number; investition: number }
export interface OnlineHausWoche { abholungen: number; zusaetzlicheKaeufe: number; versand: number; retouren: number; instoreStunden: number }
export interface OnlineWochenwert {
  woche: number; umsatz: number; basis: number; stationaer: number; anteil: number;
  conversion: number; retourenquote: number; kostenJeBestellung: number; deckungsbeitrag: number;
  clickCollectAnteil: number; bestellungen: number; retouren: number; kannibalisierung: number;
  onlineEffekt: number; kosten: number; umsatzJeGruppe: Partial<Record<GruppeId, number>>;
  haus: Record<string, OnlineHausWoche>;
}
export interface EcommerceStand {
  sortimentsbreite: number; verfuegbarkeit: number; lieferTage: number; preisFaktor: number;
  clickCollect: boolean; versandCluster: Record<string, boolean>; abholstationen: Record<string, boolean>;
  retourenHaus: Record<string, boolean>; fulfillment: FulfillmentModell; projekt?: FulfillmentProjekt;
  marketingStart: { online: number; crm: number; app: number };
  letzte?: OnlineWochenwert; verlauf: OnlineWochenwert[];
}
export type EcommerceAktion =
  | { typ: 'onlineStrategie'; sortimentsbreite?: number; verfuegbarkeit?: number; lieferTage?: number; preisFaktor?: number }
  | { typ: 'onlineClickCollect'; an: boolean }
  | { typ: 'onlineVersandCluster'; cluster: string; an: boolean }
  | { typ: 'onlineAbholstation'; haus: string; an: boolean }
  | { typ: 'onlineRetourenHaus'; haus: string; an: boolean }
  | { typ: 'onlineFulfillment'; modell: FulfillmentModell };
export const ECOMMERCE_AKTIONEN = new Set<EcommerceAktion['typ']>([
  'onlineStrategie', 'onlineClickCollect', 'onlineVersandCluster', 'onlineAbholstation',
  'onlineRetourenHaus', 'onlineFulfillment',
]);

const START = { breite: 0.65, verfuegbar: 0.88, tage: 3, bon: 68, conversion: 0.025 };
const KOSTEN = { dienstleister: 6.2, eigen: 3.9, lagerFix: 28_000, retoure: 2.8, stunde: 19 };
const RUECKGABE: Partial<Record<GruppeId, number>> = {
  damen: 0.35, herren: 0.23, kinder: 0.28, waesche: 0.16, accessoires: 0.24,
  beauty: 0.07, food: 0.035, wohnen: 0.12, sport: 0.18, spielwaren: 0.10,
  sporttextil: 0.27, sportschuhe: 0.27, outdoor: 0.17,
};
export const retourenQuote = (g: GruppeId): number => RUECKGABE[g] ?? 0.15;

const stamm = (s: GameState) => {
  const m = s.marketing?.stand?.ist;
  return {
    online: m?.kanaele?.online?.quote ?? 1,
    crm: m?.kanaele?.crm?.quote ?? 1,
    app: m?.karte?.app?.budgetWoche ?? 1,
  };
};
export function erzeugeEcommerce(s: GameState): EcommerceStand {
  return { sortimentsbreite: START.breite, verfuegbarkeit: START.verfuegbar,
    lieferTage: START.tage, preisFaktor: 1, clickCollect: false, versandCluster: {},
    abholstationen: {}, retourenHaus: {}, fulfillment: 'dienstleister',
    marketingStart: stamm(s), verlauf: [] };
}
export function ecommerceStand(s: GameState): EcommerceStand {
  return (s.ecommerce ??= erzeugeEcommerce(s));
}
export function ecommerceCluster(h: Haus): string {
  // O01 setzt haus.hauscluster. Bis dahin wird die Region als stabiler Ersatz verwendet.
  const hc = (h as Haus & { hauscluster?: string | { id: string } }).hauscluster;
  return typeof hc === 'string' ? hc : hc?.id ?? h.region;
}
const startStation = (s: GameState, h: Haus): boolean => {
  const x = h as Haus & { services?: { abholstation?: boolean } | string[]; abholstation?: boolean;
    betrieb?: { services?: { abholstation?: boolean }; kundenScore?: number } };
  const e = ecommerceStand(s);
  if (Object.prototype.hasOwnProperty.call(e.abholstationen, h.id)) return e.abholstationen[h.id];
  return !!x.abholstation || !!x.betrieb?.services?.abholstation ||
    (Array.isArray(x.services) ? x.services.includes('abholstation') : !!x.services?.abholstation);
};
export function hatAbholstation(s: GameState, h: Haus): boolean {
  return startStation(s, h);
}
function itGeneration(s: GameState): number {
  const sys = (s as GameState & { it?: { systeme?: Record<string, { generation?: number }> } }).it?.systeme;
  return sys?.ecommerce?.generation ?? sys?.ecommerce_plattform?.generation ?? 2;
}
function marketingFaktor(s: GameState, e: EcommerceStand): number {
  const m = stamm(s);
  const bezug = (a: number, b: number) => b > 0 ? clamp(a / b, 0.5, 1.8) : 1;
  return clamp(1 + 0.22 * (bezug(m.online, e.marketingStart.online) - 1)
    + 0.11 * (bezug(m.crm, e.marketingStart.crm) - 1)
    + 0.08 * (bezug(m.app, e.marketingStart.app) - 1), 0.7, 1.5);
}
function bereichsFaktor(s: GameState): number {
  // O01: personalisierte Bereichsführung, relativ zur Basisperson normiert.
  const org = (s as GameState & { organisation?: { bereiche?: Record<string, {
    basis: number; person?: { qualitaet: number }; delegiert?: boolean
  }> } }).organisation;
  const st = org?.bereiche?.ecommerce;
  return st ? clamp(1 + 0.7 * ((st.person?.qualitaet ?? 0.35) - st.basis), 0.75, 1.25) : 1;
}
function onlineFaktor(s: GameState, e: EcommerceStand): number {
  const clusterAnteil = s.haeuser.filter((h) => h.format === 'warenhaus' && h.status === 'offen'
    && e.versandCluster[ecommerceCluster(h)]).length / Math.max(1, s.haeuser.filter((h) => h.format === 'warenhaus' && h.status === 'offen').length);
  const platform = clamp(1 + (itGeneration(s) - 2) * 0.075, 0.75, 1.2);
  const digitalLeitung = clamp(vorstandWirkung(s, 'ecommerce'), 0.8, 1.25);
  const verfuegbar = Math.min(1, e.verfuegbarkeit + 0.075 * clusterAnteil);
  const preis = Math.pow(e.preisFaktor, -0.55); // höhere Preise: weniger Bestellungen, höherer Bon
  return clamp((e.sortimentsbreite / START.breite) * (verfuegbar / START.verfuegbar)
    * platform * digitalLeitung * bereichsFaktor(s) * marketingFaktor(s, e) * preis
    * Math.pow(START.tage / e.lieferTage, 0.22), 0.2, 2.4);
}
function hausWerte(): OnlineHausWoche {
  return { abholungen: 0, zusaetzlicheKaeufe: 0, versand: 0, retouren: 0, instoreStunden: 0 };
}
/** O04: Die Instore-Logistik aus dem Dienstplan begrenzt zusätzliche Paketarbeiten.
 * Vor dem Merge von O04 ist keine Kapazitätsinformation vorhanden. */
function freieLogistikStunden(h: Haus): number {
  const plan = h.personaleinsatz?.plan?.gruppen.logistik;
  return plan ? Math.max(0, plan.plan - plan.bedarf) : Infinity;
}
function kundenScore(h: Haus): number {
  const betreib = h as Haus & { betrieb?: { kundenScore?: number } };
  return clamp(betreib.betrieb?.kundenScore || h.substanz, 0, 100);
}
// Alternde Ware wird erst für tatsächlich zusätzliche SFS-Sendungen ausgebucht.
// Bei O05 ist die Kohorte einem Hauscluster zugeordnet; davor wird die Konzernkohorte verwendet.
function altwareAbbauen(s: GameState, cluster: string, g: GruppeId, ek: number): number {
  let rest = eur(Math.max(0, ek)), gesamt = 0;
  const kohorten = s.bestand.filter((b) => b.gruppe === g && b.alter >= (b.art === 'nos' ? 52 : 16)
    && (!(b as typeof b & { hauscluster?: string }).hauscluster
      || (b as typeof b & { hauscluster?: string }).hauscluster === cluster))
    .sort((a, b) => b.alter - a.alter);
  for (const b of kohorten) {
    if (rest <= 0) break;
    const n = Math.min(rest, b.wert); b.wert -= n; rest -= n; gesamt += n;
  }
  s.bestand = s.bestand.filter((b) => b.wert > 0);
  return gesamt;
}
export function ecommerceWoche(s: GameState, k: WochenKpi): void {
  if (s.ecommerceDeaktiviert) return;
  const e = ecommerceStand(s);
  if (e.projekt && s.woche >= e.projekt.bis) {
    e.fulfillment = e.projekt.modell;
    melde(s, 'info', 'hartwig.de: Eigenlager/Fulfillment-Projekt abgeschlossen. Modell: ' + (e.fulfillment === 'eigen' ? 'eigenes Lager' : 'Dienstleister') + '.', { modul: 'ecommerce' });
    delete e.projekt;
  }
  // O09: delegiertes Online-Sortiment wird vom CDO quartalsweise nach Fachwissen gesteuert.
  const cdo = s.vorstand?.ressorts?.cdo;
  const org = (s as GameState & { organisation?: { bereiche?: Record<string, {
    person?: { qualitaet: number }; delegiert?: boolean
  }> } }).organisation?.bereiche?.ecommerce;
  const delegation = !!(cdo?.person && cdo.delegation.onlinesortiment) || !!org?.delegiert;
  if (!s.prognose && s.woche > 0 && s.woche % 13 === 0 && delegation) {
    const guete = 0.6 * (cdo?.person?.fachwissen ?? 50) / 100 + 0.4 * (org?.person?.qualitaet ?? 0.5);
    e.sortimentsbreite = clamp(Math.round((e.sortimentsbreite + (guete - 0.45) * 0.04) * 1000) / 1000, 0.2, 1);
    e.verfuegbarkeit = clamp(Math.round((e.verfuegbarkeit + (guete - 0.5) * 0.02) * 1000) / 1000, 0.5, 1);
    if (guete > 0.8 && e.lieferTage > 1) e.lieferTage -= 1;
  }
  const haeuser = s.haeuser.filter((h) => h.format === 'warenhaus' && h.status !== 'geschlossen' && h.status !== 'verkauft' && !!h.kpi);
  const proGruppe: Partial<Record<GruppeId, number>> = {};
  const regioAnteil: Record<string, number> = {};
  const clusterHaeuser: Record<string, Haus[]> = {};
  let summe = 0;
  for (const h of haeuser) {
    const c = ecommerceCluster(h);
    (clusterHaeuser[c] ??= []).push(h);
    for (const [g, u] of Object.entries(h.kpi!.umsatzJeGruppe) as [GruppeId, number][]) {
      const x = Math.max(0, u) * 0.08;
      proGruppe[g] = (proGruppe[g] ?? 0) + x;
      regioAnteil[h.region] = (regioAnteil[h.region] ?? 0) + x;
      summe += x;
    }
  }
  const faktor = onlineFaktor(s, e);
  const basis = eur(summe);
  const ziel = eur(summe * faktor * e.preisFaktor);
  const differenz = ziel - basis;
  const quote = summe ? Object.entries(proGruppe).reduce((a, [g, v]) =>
    a + (v ?? 0) * retourenQuote(g as GruppeId), 0) / summe : 0;
  const kundenBon = START.bon * e.preisFaktor;
  const bestellungen = Math.round(ziel / Math.max(1, kundenBon));
  const abholer = e.clickCollect ? haeuser.filter((h) => hatAbholstation(s, h)) : [];
  const clickQuote = abholer.length && haeuser.length ? clamp(0.14 * abholer.length / haeuser.length, 0, 0.22) : 0;
  const haus: Record<string, OnlineHausWoche> = {};
  for (const h of haeuser) haus[h.id] = hausWerte();
  let kosten = 0, zusatz = 0, altware = 0;
  const abholungen = Math.round(bestellungen * clickQuote);
  if (abholer.length) {
    const proHaus = Math.floor(abholungen / abholer.length);
    let rest = abholungen - proHaus * abholer.length;
    for (const h of abholer) {
      const moeglich = Math.max(0, Math.floor(freieLogistikStunden(h) / 0.11));
      const n = Math.min(proHaus + (rest-- > 0 ? 1 : 0), moeglich);
      haus[h.id].abholungen += n; haus[h.id].instoreStunden += n * 0.11;
      const kauf = eur(n * 0.12 * 24); // Mitnahme in der Fläche nach Abholung
      haus[h.id].zusaetzlicheKaeufe += kauf;
      // Der Mehrkauf findet tatsächlich in diesem Haus statt (nicht in einem fiktiven Webshop).
      if (h.kpi) {
        h.kpi.umsatz += kauf;
        const marge = eur(kauf * 0.37);
        h.kpi.rohertrag += marge;
        h.kpi.db += marge;
        h.kpi.umsatzJeGruppe.accessoires = (h.kpi.umsatzJeGruppe.accessoires ?? 0) + kauf;
      }
      zusatz += kauf;
    }
  }
  for (const [c, aktiv] of Object.entries(e.versandCluster)) {
    if (!aktiv || !clusterHaeuser[c]?.length) continue;
    const hs = clusterHaeuser[c];
    const anteil = hs.reduce((a, h) => a + (h.kpi?.umsatz ?? 0), 0) / Math.max(1, haeuser.reduce((a, h) => a + (h.kpi?.umsatz ?? 0), 0));
    const n = Math.round(bestellungen * 0.22 * anteil);
    const proHaus = Math.floor(n / hs.length);
    let rest = n - proHaus * hs.length;
    let versendet = 0;
    for (const h of hs) {
      const frei = Math.max(0, freieLogistikStunden(h) - haus[h.id].instoreStunden);
      const stueck = Math.min(proHaus + (rest-- > 0 ? 1 : 0), Math.floor(frei / 0.28));
      haus[h.id].versand += stueck;
      haus[h.id].instoreStunden += stueck * 0.28;
      versendet += stueck;
    }
    // Nur zusätzlicher Onlineabsatz benötigt über die Basis hinaus neuen Wareneinsatz.
    if (differenz > 0 && summe > 0) {
      for (const [g, v] of Object.entries(proGruppe) as [GruppeId, number][]) {
        const ek = differenz * 0.22 * anteil * (versendet / Math.max(1, n)) * ((v ?? 0) / summe) * (1 - GRUPPEN[g].marge);
        altware += altwareAbbauen(s, c, g, ek);
      }
    }
  }
  const hausRetouren = haeuser.filter((h) => e.retourenHaus[h.id] && hatAbholstation(s, h));
  const rueck = Math.round(bestellungen * quote);
  if (hausRetouren.length) {
    const imHaus = Math.round(rueck * 0.35);
    const proHaus = Math.floor(imHaus / hausRetouren.length);
    let rest = imHaus - proHaus * hausRetouren.length;
    for (const h of hausRetouren) {
      const frei = Math.max(0, freieLogistikStunden(h) - haus[h.id].instoreStunden);
      const n = Math.min(proHaus + (rest-- > 0 ? 1 : 0), Math.floor(frei / 0.16));
      haus[h.id].retouren += n; haus[h.id].instoreStunden += n * 0.16;
    }
    // Nur neu entstandene Retouren auf Mehrumsatz gehen zurück in den O05-Clusterbestand.
    if (differenz > 0 && summe > 0) for (const [g, v] of Object.entries(proGruppe) as [GruppeId, number][]) {
      const ek = eur(differenz * 0.35 * ((v ?? 0) / summe) * retourenQuote(g) * (1 - GRUPPEN[g].marge));
      if (ek > 0) {
        const cluster = ecommerceCluster(hausRetouren[0]);
        const zielK = s.bestand.find((b) => b.gruppe === g && b.alter === 0
          && (b as typeof b & { hauscluster?: string }).hauscluster === cluster);
        if (zielK) zielK.wert += ek;
        else s.bestand.push({ gruppe: g, wert: ek, alter: 0, saisonAnteil: GRUPPEN[g].saisonAnteil,
          kostenFaktor: 1, hauscluster: cluster } as typeof s.bestand[number]);
      }
    }
  }
  const stunden = Object.values(haus).reduce((a, h) => a + h.instoreStunden, 0);
  // Ausgangsbestand enthält die bisherigen Dienstleisterkosten bereits. Nur inkrementell buchen.
  const extraPakete = differenz / Math.max(1, kundenBon);
  const paketBasis = basis / START.bon;
  const dezember = (s.woche % 52) >= 47 && (s.woche % 52) <= 51;
  const paketPreis = e.fulfillment === 'eigen' ? KOSTEN.eigen : KOSTEN.dienstleister * (dezember ? 1.25 : 1);
  const baselinePreis = KOSTEN.dienstleister * (dezember ? 1.25 : 1);
  kosten = eur(extraPakete * baselinePreis + (paketPreis - baselinePreis) * bestellungen
    + (e.fulfillment === 'eigen' ? KOSTEN.lagerFix : 0)
    + stunden * KOSTEN.stunde
    + Math.max(0, extraPakete) * quote * KOSTEN.retoure);
  // Regionale Verlagerung: Online-Nachfrage verschiebt den Absatz der Häuser derselben Region.
  // Schlechte Kundenscores (O07, sonst Substanz als Proxy) erhöhen das Risiko.
  const schwach = haeuser.length ? haeuser.reduce((a, h) => a + (100 - kundenScore(h)) / 100, 0) / haeuser.length : 0;
  const kanni = eur(Math.max(0, differenz) * (0.17 + 0.23 * schwach));
  if (kanni > 0 && summe > 0) {
    let uebrig = kanni;
    const regionen = Object.entries(regioAnteil);
    for (let ri = 0; ri < regionen.length; ri++) {
      const [region, onlineBasis] = regionen[ri];
      const aktuell = ri === regionen.length - 1 ? uebrig : Math.min(uebrig, eur(kanni * onlineBasis / summe));
      uebrig -= aktuell;
      const lokal = haeuser.filter((h) => h.region === region && h.kpi && h.kpi.umsatz > 0);
      const gewichte = lokal.map((h) => h.kpi!.umsatz * (1 + (100 - kundenScore(h)) / 100));
      const gewicht = gewichte.reduce((a, v) => a + v, 0);
      let restRegion = aktuell;
      for (let i = 0; i < lokal.length; i++) {
        const h = lokal[i], kpi = h.kpi!;
        const verlust = i === lokal.length - 1 ? restRegion : Math.min(restRegion, eur(aktuell * gewichte[i] / Math.max(1, gewicht)));
        restRegion -= verlust;
        const vorher = kpi.umsatz;
        kpi.umsatz -= verlust;
        const satz = vorher > 0 ? verlust / vorher : 0;
        let ertragsverlust = 0;
        for (const [g, u] of Object.entries(kpi.umsatzJeGruppe) as [GruppeId, number][]) {
          const teil = eur((u ?? 0) * satz);
          kpi.umsatzJeGruppe[g] = Math.max(0, (u ?? 0) - teil);
          ertragsverlust += teil * GRUPPEN[g].marge;
        }
        kpi.rohertrag -= eur(ertragsverlust);
        kpi.db -= eur(ertragsverlust);
      }
    }
  }
  const netto = differenz + zusatz - kanni;
  const mixMarge = summe > 0 ? Object.entries(proGruppe).reduce((a, [g, v]) =>
    a + (v ?? 0) * GRUPPEN[g as GruppeId].marge, 0) / summe : 0.38;
  // Zusatzverkäufe müssen Ware abbauen; SFS-Altware wurde oben bereits entnommen.
  // Die 8-%-Ausgangsbasis darf nicht ein zweites Mal den Warenbestand belasten.
  let zusatzEk = eur(Math.max(0, differenz) * (1 - mixMarge) + zusatz * 0.63 - altware);
  if (zusatzEk > 0) {
    const kohorten = [...s.bestand].sort((a, b) => b.alter - a.alter);
    for (const kohorte of kohorten) {
      if (zusatzEk <= 0) break;
      const n = Math.min(kohorte.wert, zusatzEk);
      kohorte.wert -= n;
      zusatzEk -= n;
    }
    s.bestand = s.bestand.filter((x) => x.wert > 0);
  }
  k.umsatz += netto;
  k.rohertrag += eur((differenz - kanni) * mixMarge + zusatz * 0.37);
  k.logistik += kosten;
  k.onlineUmsatz = ziel;
  k.onlineKannibalisierung = kanni;
  k.onlineEffekt = netto;
  const letzte: OnlineWochenwert = {
    woche: s.woche, umsatz: ziel, basis, stationaer: eur(k.umsatz - ziel), anteil: k.umsatz > 0 ? ziel / k.umsatz : 0,
    conversion: START.conversion * faktor, retourenquote: quote,
    kostenJeBestellung: bestellungen > 0 ? Math.max(0, kosten + baselinePreis * bestellungen) / bestellungen : 0,
    deckungsbeitrag: eur(ziel * mixMarge - (kosten + baselinePreis * bestellungen) - ziel / kundenBon * quote * KOSTEN.retoure),
    clickCollectAnteil: bestellungen ? abholer.reduce((a, h) => a + haus[h.id].abholungen, 0) / bestellungen : 0,
    bestellungen, retouren: rueck, kannibalisierung: kanni,
    onlineEffekt: netto, kosten, umsatzJeGruppe: Object.fromEntries(Object.entries(proGruppe).map(([g, v]) => [g, eur((v ?? 0) * ziel / Math.max(1, summe))])),
    haus,
  };
  e.letzte = letzte;
  if (!s.prognose) {
    e.verlauf.push(letzte);
    if (e.verlauf.length > 104) e.verlauf.shift();
  }
}
export function ecommerceAktion(s: GameState, a: EcommerceAktion): { ok: boolean; text: string } {
  const e = ecommerceStand(s);
  if (a.typ === 'onlineStrategie') {
    if (a.sortimentsbreite === undefined && a.verfuegbarkeit === undefined && a.lieferTage === undefined && a.preisFaktor === undefined)
      return { ok: false, text: 'Keine Änderung angegeben.' };
    if ((a.sortimentsbreite !== undefined && (a.sortimentsbreite < 0.2 || a.sortimentsbreite > 1))
      || (a.verfuegbarkeit !== undefined && (a.verfuegbarkeit < 0.5 || a.verfuegbarkeit > 1))
      || (a.lieferTage !== undefined && (!Number.isInteger(a.lieferTage) || a.lieferTage < 1 || a.lieferTage > 7))
      || (a.preisFaktor !== undefined && (a.preisFaktor < 0.75 || a.preisFaktor > 1.25)))
      return { ok: false, text: 'Ungültige Online-Parameter.' };
    if (a.sortimentsbreite !== undefined) e.sortimentsbreite = a.sortimentsbreite;
    if (a.verfuegbarkeit !== undefined) e.verfuegbarkeit = a.verfuegbarkeit;
    if (a.lieferTage !== undefined) e.lieferTage = a.lieferTage;
    if (a.preisFaktor !== undefined) e.preisFaktor = a.preisFaktor;
    return { ok: true, text: 'Online-Sortiment und Lieferversprechen angepasst.' };
  }
  if (a.typ === 'onlineClickCollect') { e.clickCollect = a.an; return { ok: true, text: 'Click & Collect ' + (a.an ? 'aktiviert.' : 'deaktiviert.') }; }
  if (a.typ === 'onlineVersandCluster') {
    if (!s.haeuser.some((h) => ecommerceCluster(h) === a.cluster && h.format === 'warenhaus' && h.status === 'offen'))
      return { ok: false, text: 'Hauscluster nicht gefunden oder ohne offenes Hartwig-Haus.' };
    e.versandCluster[a.cluster] = a.an;
    return { ok: true, text: 'Versand aus dem Haus für ' + a.cluster + (a.an ? ' aktiviert.' : ' deaktiviert.') };
  }
  if (a.typ === 'onlineAbholstation' || a.typ === 'onlineRetourenHaus') {
    const h = s.haeuser.find((h) => h.id === a.haus && h.format === 'warenhaus' && h.status === 'offen');
    if (!h) return { ok: false, text: 'Offenes Hartwig-Haus nicht gefunden.' };
    if (a.typ === 'onlineAbholstation') {
      if (a.an && !hatAbholstation(s, h)) einmalKosten(s, 22_000);
      e.abholstationen[h.id] = a.an;
    } else {
      if (a.an && !hatAbholstation(s, h)) return { ok: false, text: 'Für Hausretouren ist eine Abholstation erforderlich.' };
      e.retourenHaus[h.id] = a.an;
    }
    return { ok: true, text: (a.typ === 'onlineAbholstation' ? 'Abholstation' : 'Retourenannahme') + (a.an ? ' aktiviert.' : ' deaktiviert.') };
  }
  if (a.typ === 'onlineFulfillment') {
    if (e.projekt) return { ok: false, text: 'Ein Fulfillment-Projekt läuft bereits.' };
    if (e.fulfillment === a.modell) return { ok: false, text: 'Dieses Fulfillment-Modell ist bereits aktiv.' };
    const investition = a.modell === 'eigen' ? 4_800_000 : 320_000;
    if (s.cash + s.kreditlinie < investition) return { ok: false, text: 'Nicht genügend Finanzierungsspielraum.' };
    e.projekt = { modell: a.modell, start: s.woche, bis: s.woche + (a.modell === 'eigen' ? 16 : 8), investition };
    einmalKosten(s, investition);
    melde(s, 'info', 'Projekt Fulfillment gestartet. Geplante Fertigstellung KW ' + ((e.projekt.bis % 52) + 1) + '.', { modul: 'ecommerce' });
    return { ok: true, text: 'Fulfillment-Projekt gestartet. Laufzeit ' + (e.projekt.bis - s.woche) + ' Wochen.' };
  }
  return { ok: false, text: 'Unbekannte Online-Aktion.' };
}
export function ecommerceUebersicht(s: GameState) {
  const e = ecommerceStand(s), c = e.letzte;
  const cluster = [...new Set(s.haeuser.filter((h) => h.format === 'warenhaus' && h.status === 'offen').map(ecommerceCluster))]
    .sort((a, b) => a.localeCompare(b, 'de')).map((id) => ({ id, aktiv: !!e.versandCluster[id],
      haeuser: s.haeuser.filter((h) => ecommerceCluster(h) === id && h.format === 'warenhaus' && h.status === 'offen').length }));
  const haeuser = s.haeuser.filter((h) => h.format === 'warenhaus' && h.status === 'offen').map((h) => ({
    id: h.id, name: h.name, stadt: h.stadt, cluster: ecommerceCluster(h), station: hatAbholstation(s, h),
    retourenAn: !!e.retourenHaus[h.id], ...(c?.haus[h.id] ?? hausWerte()),
  }));
  return { ...(c ?? { umsatz: 0, basis: 0, stationaer: 0, anteil: 0, conversion: START.conversion,
    retourenquote: 0, kostenJeBestellung: 0, deckungsbeitrag: 0, clickCollectAnteil: 0, bestellungen: 0,
    retouren: 0, kannibalisierung: 0, onlineEffekt: 0, kosten: 0, umsatzJeGruppe: {}, haus: {} }),
    sortimentsbreite: e.sortimentsbreite, verfuegbarkeit: e.verfuegbarkeit, lieferTage: e.lieferTage,
    preisFaktor: e.preisFaktor, clickCollect: e.clickCollect, fulfillment: e.fulfillment, projekt: e.projekt,
    cluster, haeuser, verlauf: e.verlauf.map((v) => ({ woche: v.woche, umsatz: v.umsatz, anteil: v.anteil,
      deckungsbeitrag: v.deckungsbeitrag, kannibalisierung: v.kannibalisierung })) };
}
export function ecommerceHaus(s: GameState, id: string) {
  const h = s.haeuser.find((x) => x.id === id);
  if (!h) return undefined;
  return { station: hatAbholstation(s, h), ...(ecommerceStand(s).letzte?.haus[id] ?? hausWerte()),
    retourenAn: !!ecommerceStand(s).retourenHaus[id], versandAn: !!ecommerceStand(s).versandCluster[ecommerceCluster(h)] };
}

/** O02-Adapter für die Umsatzbrücke: eigener Effekt „Online“, ohne Hausumsätze nochmals zu addieren. */
export function ecommerceBruecke(s: GameState, wochen = 1) {
  const x = ecommerceStand(s).verlauf.slice(-Math.max(1, Math.floor(wochen)));
  return { titel: 'Online', umsatzveraenderung: eur(x.reduce((a, v) => a + v.onlineEffekt, 0)),
    kannibalisierung: eur(x.reduce((a, v) => a + v.kannibalisierung, 0)),
    zusatzUmsatzOnline: eur(x.reduce((a, v) => a + v.umsatz - v.basis, 0)) };
}

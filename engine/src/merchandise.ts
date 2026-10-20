// O05 Ware: Merchandise Planning, Allokation, lokale Preissteuerung und Inventur.
// Keine eigene Zufallsquelle: deterministische Clusterverteilung, Startzustand wirtschaftlich neutral.
import type { GameState, GruppeId, Haus, Kohorte } from './types';
import { WG_DEF, WG_JE_BEREICH, EK_PARAM, saisonId, saisonName, limitFuer } from './einkauf';
import { GRUPPEN } from './daten';
import { clamp, eur, melde } from './util';
// O01: Leitung, Delegation und Posteingang.
import { bereichsQualitaet, istDelegiert, neueVorlage } from './organisation';

export interface WarenPlan {
  wg: string;
  saison: number;
  budget: number;
  zielmarge: number;
  zielabverkauf: number;
  breite: number;
  vororderquote: number;
}
export interface WarenUmlagerung {
  gruppe: GruppeId;
  von: string;
  nach: string;
  ankunft: number;
  kosten: number;
  kohorten: Kohorte[];
}
export interface WareStand {
  /** Qualität 1 bedeutet verlustfreie Verteilung gemäß Bedarf. */
  allokationQualitaet: number;
  /** Die lokale Bestandsbegrenzung wird nach einer Steuerungsentscheidung scharfgeschaltet. */
  steuerungAktiv: boolean;
  bedarf: Partial<Record<GruppeId, Record<string, number>>>;
  umlagerungen: WarenUmlagerung[];
  zentral: Record<string, boolean>;
  lokal: Record<string, number>;
  plaene: Record<string, WarenPlan>;
  vorlagen: { id: string; wg: string; saison: number; frist: number; erledigt: boolean }[];
  fundusEigen: number;
  fundusFremd: number;
  inventur: Record<string, { woche: number; differenz: number; quote: number }>;
  letzterInventurverlust: number;
  /** O01-Leitungsqualität auf den Startwert normiert. */
  allokationStart?: number;
}
export type WareAktion =
  | { typ: 'allokationQualitaet'; qualitaet: number }
  | { typ: 'umlagerung'; gruppe: GruppeId; von: string; nach: string; wert: number }
  | { typ: 'reduzierungZentral'; gruppe?: GruppeId; hauscluster?: string; an: boolean }
  | { typ: 'reduzierungLokal'; gruppe: GruppeId; hauscluster: string; punkte: number }
  | { typ: 'merchandisePlan'; wg: string; saison: number; budget?: number; zielmarge?: number; zielabverkauf?: number; breite?: number; vororderquote?: number }
  | { typ: 'fundusAbfluss'; gruppe: GruppeId; wert: number }
  | { typ: 'flaechenZuteilung'; haus: string; von: GruppeId; nach: GruppeId; qm: number }
  | { typ: 'warensicherung'; haus: string; an: boolean };
export const WARE_AKTIONEN = new Set(['allokationQualitaet', 'umlagerung', 'reduzierungZentral', 'reduzierungLokal', 'merchandisePlan', 'fundusAbfluss', 'flaechenZuteilung', 'warensicherung']);

type ClusterHaus = Haus & { hauscluster?: string; warensicherung?: boolean; letzteInventur?: number };
export const hausclusterId = (h: Haus): string => (h as ClusterHaus).hauscluster || h.region;

/** Bis O01 gemergt ist: 6 bis 12 Häuser je geografischer Übergangsgruppe.
 * Sobald O01 die offiziellen Hauscluster gesetzt hat, bleibt deren Zuordnung unverändert. */
function ersatzHauscluster(s: GameState): void {
  const regionen = [...new Set(s.haeuser.map(h => h.region))].sort();
  for (const region of regionen) {
    const hs = s.haeuser.filter(h => h.region === region && !(h as ClusterHaus).hauscluster)
      .sort((a, b) => a.id.localeCompare(b.id));
    for (let i = 0, n = 1; i < hs.length; n++) {
      const rest = hs.length - i;
      const count = rest > 12 && rest - 9 < 6 ? rest - 6 : Math.min(9, rest);
      for (const h of hs.slice(i, i + count)) (h as ClusterHaus).hauscluster = `ware-${region}-${n}`;
      i += count;
    }
  }
}

export function clusterListe(s: GameState): { id: string; name: string; haeuser: Haus[] }[] {
  const map = new Map<string, Haus[]>();
  for (const h of s.haeuser) {
    const id = hausclusterId(h);
    const xs = map.get(id) ?? [];
    xs.push(h);
    map.set(id, xs);
  }
  const namen = new Map(s.organisation?.hauscluster.map(c => [c.id, c.name]) ?? []);
  return Array.from(map, ([id, haeuser]) => ({ id, name: namen.get(id) ?? id, haeuser }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));
}
function basis(h: Haus, g: GruppeId): number {
  const qm = h.flaechen.filter(f => f.gruppe === g && f.konzept === 'eigen').reduce((a, f) => a + f.qm, 0);
  return (h.status === 'geschlossen' || h.status === 'verkauft') ? 0 :
    (h.potenzial[g] ?? 0) * (1 - Math.exp(-qm / Math.max(1, h.saettigungQm[g] ?? 1)));
}
function gewichte(s: GameState, g: GruppeId): Record<string, number> {
  const c = clusterListe(s);
  const v = c.map(x => x.haeuser.reduce((a, h) => a + basis(h, g), 0));
  const total = v.reduce((a, b) => a + b, 0);
  return Object.fromEntries(c.map((x, i) => [x.id, total > 0 ? v[i] / total : 1 / Math.max(1, c.length)]));
}
function verteile(s: GameState, k: Kohorte, gewicht: Record<string, number>): Kohorte[] {
  const ids = Object.keys(gewicht).sort();
  if (!ids.length) return [k];
  let rest = k.wert;
  return ids.map((id, i) => {
    const wert = i === ids.length - 1 ? rest : Math.min(rest, eur(k.wert * gewicht[id]));
    rest -= wert;
    return { ...k, hauscluster: id, wert };
  }).filter(k => k.wert > 0);
}
function schiefe(g: Record<string, number>, qualitaet: number): Record<string, number> {
  if (qualitaet >= 1) return g;
  const ids = Object.keys(g).sort();
  if (ids.length < 2) return g;
  const fehler = (1 - qualitaet) * 0.5;
  const soll = ids.map(id => g[id]);
  const verschoben = soll.map((x, i) => x * (1 - fehler) + soll[(i + ids.length - 1) % ids.length] * fehler);
  return Object.fromEntries(ids.map((id, i) => [id, verschoben[i]]));
}
/** Sowohl beim Start als auch nach einem NOS-/Saison-Wareneingang: exakte Werterhaltung. */
export function verteileZugang(s: GameState): void {
  if (!s.ware) return;
  const offen = s.bestand.some(k => !k.hauscluster);
  if (!offen) return;
  const gesamt = new Map<GruppeId, Record<string, number>>();
  const neu: Kohorte[] = [];
  for (const k of s.bestand) {
    if (k.hauscluster) { neu.push(k); continue; }
    let g = gesamt.get(k.gruppe);
    if (!g) {
      const ist = bereichsQualitaet(s, 'allokation');
      const basis = s.ware.allokationStart ?? ist;
      const faktor = basis > 0 ? clamp(ist / basis, 0, 1) : 1;
      g = schiefe(gewichte(s, k.gruppe), s.ware.allokationQualitaet * faktor);
      gesamt.set(k.gruppe, g);
    }
    neu.push(...verteile(s, k, g));
  }
  s.bestand = neu;
}
export function initialisiereWare(s: GameState): void {
  ersatzHauscluster(s);
  s.ware = {
    allokationQualitaet: 1, steuerungAktiv: false, bedarf: {}, umlagerungen: [],
    zentral: {}, lokal: {}, plaene: {}, vorlagen: [], fundusEigen: 0,
    fundusFremd: 60_000_000, inventur: {}, letzterInventurverlust: 0,
    allokationStart: bereichsQualitaet(s, 'allokation'),
  };
  verteileZugang(s);
}
/** Nach Eingang fälliger Lieferungen, vor der wöchentlichen Nachfrage. */
export function wareWoche(s: GameState): void {
  if (!s.ware) initialisiereWare(s); // alte Speicherstände
  const w = s.ware!;
  for (const t of w.umlagerungen.filter(t => t.ankunft <= s.woche)) {
    s.bestand.push(...t.kohorten.map(k => ({ ...k, hauscluster: t.nach })));
  }
  w.umlagerungen = w.umlagerungen.filter(t => t.ankunft > s.woche);
  verteileZugang(s);
  // 30 Wochen vor Saison: eine gebündelte Vorlage im O01-Posteingang.
  // Bei Delegation wird die Planqualität wirksam; ohne Eingriff bleibt die Startrechnung neutral.
  if (s.woche % 26 === 0 && !s.prognose) {
    const sid = saisonId(s.woche + 30);
    if (!w.vorlagen.some(v => v.saison === sid)) {
      w.vorlagen.push({ id: `ware-${sid}`, wg: 'alle', saison: sid, frist: s.woche + 2, erledigt: false });
      neueVorlage(s, {
        bereich: 'merchandise_planning', titel: `Saisonbudget ${saisonName(s, sid)}`,
        text: `Open-to-Buy, Zielmarge, Sortimentsbreite und Vororder für ${WG_DEF.length} Warengruppen zur Freigabe. Die Einzelbudgets stehen im Einkaufsreiter Merchandise.`,
        frist: 2,
      });
      melde(s, 'info', `Merchandise Planning: Saisonplanung ${saisonName(s, sid)} bereit.`, { modul: 'einkauf' });
      if (istDelegiert(s, 'merchandise_planning')) {
        const q = bereichsQualitaet(s, 'merchandise_planning');
        for (const d of WG_DEF) {
          const st = s.einkauf.wgs[d.id];
          if (!st) continue;
          const l = limitFuer(s, st, sid);
          const delta = (1 - q) * 0.5 * (0.2 - d.anteil);
          const faktor = clamp(1 + delta, 0.8, 1.2);
          const budget = eur(l.plan * st.st.limitFaktor * faktor);
          st.st.limitEuro = budget;
          w.plaene[`${d.id}|${sid}`] = {
            wg: d.id, saison: sid, budget,
            zielmarge: st.margeSaison, zielabverkauf: 0.75,
            breite: 0.5, vororderquote: st.st.vororderquote,
          };
        }
      }
    }
  }
  for (const v of w.vorlagen) if (!v.erledigt && s.woche > v.frist) v.erledigt = true;
  w.vorlagen = w.vorlagen.filter(v => !v.erledigt || v.frist > s.woche - 26);
  // Inventur in KW 6: voraggregierte Clustergruppen statt wiederholter Vollscans.
  if (s.woche % 52 === 5 && !s.prognose) {
    const rang: { haus: Haus; differenz: number }[] = [];
    const stand = new Map<string, number>();
    const basisCluster = new Map<string, number>();
    const schadenCluster = new Map<string, number>();
    for (const k of s.bestand) {
      const key = `${k.hauscluster}|${k.gruppe}`;
      stand.set(key, (stand.get(key) ?? 0) + k.wert);
    }
    const offene = s.haeuser.filter(h => h.status === 'offen');
    for (const h of offene) for (const g of Object.keys(h.potenzial) as GruppeId[]) {
      const volumen = basis(h, g), key = `${hausclusterId(h)}|${g}`;
      basisCluster.set(key, (basisCluster.get(key) ?? 0) + volumen);
      schadenCluster.set(key, (schadenCluster.get(key) ?? 0) + volumen *
        ((h as ClusterHaus).warensicherung ? 0.003 : 0.006));
    }
    let summe = 0;
    for (const h of offene) {
      const hc = hausclusterId(h);
      let differenz = 0;
      for (const g of Object.keys(h.potenzial) as GruppeId[]) {
        const key = `${hc}|${g}`;
        const anteil = basis(h, g) / Math.max(1, basisCluster.get(key) ?? 0);
        const verwaltung = clamp((h.personal.vollzeit + h.personal.teilzeit) / Math.max(1, h.grundflaecheQm / 80), 0.5, 1.4);
        const rate = (h as ClusterHaus).warensicherung ? 0.003 : 0.006;
        differenz += (stand.get(key) ?? 0) * anteil * rate / verwaltung;
      }
      const wert = eur(differenz);
      (h as ClusterHaus).letzteInventur = wert;
      w.inventur[h.id] = { woche: s.woche, differenz: wert, quote: wert / Math.max(1, h.kpi?.umsatz ?? 1) };
      rang.push({ haus: h, differenz: wert });
      summe += wert;
    }
    w.letzterInventurverlust = eur(summe);
    rang.sort((a, b) => b.differenz - a.differenz);
    melde(s, 'info', `Inventur KW 6: ${eur(summe).toLocaleString('de-DE')} € rechnerische Differenz. Höchste Werte: ${rang.slice(0, 5).map(x => x.haus.name).join(', ')}.`, { modul: 'einkauf' });
    // Startdifferenzen sind in den bestehenden Abschriften bereits kalkuliert.
    if (w.steuerungAktiv) for (const k of s.bestand) {
      const key = `${k.hauscluster}|${k.gruppe}`, volumen = basisCluster.get(key) ?? 0;
      const rate = volumen > 0 ? (schadenCluster.get(key) ?? 0) / volumen : 0;
      k.wert = eur(k.wert * (1 - rate));
    }
  }
}
/** Nachfrageanteile nach Hauscluster werden für den Verbrauch festgehalten. */
export function wareBedarf(s: GameState, roh: { haus: Haus; eigen: Partial<Record<GruppeId, { brutto: number }>> }[]): void {
  if (!s.ware) return;
  const basisJe: Partial<Record<GruppeId, Record<string, number>>> = {};
  for (const r of roh) for (const [g, b] of Object.entries(r.eigen) as [GruppeId, { brutto: number }][]) {
    const hc = hausclusterId(r.haus);
    const v = (basisJe[g] ??= {});
    v[hc] = (v[hc] ?? 0) + b.brutto;
  }
  for (const [g, x] of Object.entries(basisJe) as [GruppeId, Record<string, number>][]) {
    const summe = Object.values(x).reduce((a, b) => a + b, 0);
    s.ware.bedarf[g] = Object.fromEntries(Object.keys(x).map(k => [k, summe > 0 ? x[k] / summe : 0]));
  }
}
/** Nur nach veränderter Allokationssteuerung wird der Hauscluster zum harten Bestandslimit. */
export function verbraucheCluster(
  s: GameState, kohorten: Kohorte[] | undefined, wert: number, altMax: number, gruppe: GruppeId,
  verbrauch: (ks: Kohorte[], wert: number, alt: number) => { voll: number; gebucht: number; alt: number },
): { voll: number; gebucht: number; alt: number } {
  if (!s.ware?.steuerungAktiv || !kohorten) return verbrauch(kohorten ?? [], wert, altMax);
  const soll = s.ware.bedarf[gruppe] ?? gewichte(s, gruppe);
  const ids = Object.keys(soll).sort();
  let voll = 0, gebucht = 0, alt = 0;
  for (const id of ids) {
    const r = verbrauch(kohorten.filter(k => k.hauscluster === id), wert * soll[id], altMax * soll[id]);
    voll += r.voll; gebucht += r.gebucht; alt += r.alt;
  }
  return { voll, gebucht, alt };
}
export function verdichteWare(s: GameState): void {
  if (!s.ware) return;
  const map = new Map<string, Kohorte>();
  for (const k of s.bestand) {
    if (k.wert <= 0.5) continue;
    const key = [k.hauscluster, k.gruppe, k.wg, k.art, k.marke, k.saisonId, k.alter, k.kostenFaktor, k.ladenhueter].join('|');
    const alt = map.get(key);
    if (alt) alt.wert += k.wert;
    else map.set(key, k);
  }
  s.bestand = Array.from(map.values());
}
export function reduzierungGesperrt(s: GameState, gruppe: GruppeId, cluster: string): boolean {
  const x = s.ware?.zentral ?? {};
  return !!(x['*|*'] || x[`${gruppe}|*`] || x[`*|${cluster}`] || x[`${gruppe}|${cluster}`]);
}
export function preisFaktorHaus(s: GameState, h: Haus, g: GruppeId): number {
  const hc = hausclusterId(h);
  if (reduzierungGesperrt(s, g, hc)) return 1;
  const pp = s.ware?.lokal[`${g}|${hc}`] ?? 0;
  return 1 - pp * 0.25; // lokale zusätzliche Nachlässe betreffen nur den reduzierten Altware-Teil
}
export function fundusFrequenzFaktor(s: GameState): number {
  const w = s.ware;
  if (!w) return 1;
  const eigenquote = w.fundusEigen / Math.max(1, w.fundusEigen + w.fundusFremd);
  return 1 - 0.15 * clamp((eigenquote - 0.25) / 0.25, 0, 1);
}
export function warenUebersicht(s: GameState) {
  const w = s.ware;
  const cluster = clusterListe(s).map(c => {
    const bestand = s.bestand.filter(k => k.hauscluster === c.id);
    const wert = bestand.reduce((a, k) => a + k.wert, 0);
    const alt = bestand.filter(k => k.ladenhueter || k.alter > (k.art === 'nos' ? EK_PARAM.altNos : EK_PARAM.altSaison)).reduce((a, k) => a + k.wert, 0);
    const umsatz = c.haeuser.reduce((a, h) => a + (h.kpi?.umsatz ?? 0), 0);
    return { id: c.id, name: c.name, haeuser: c.haeuser.length, bestand: eur(wert),
      altware: wert > 0 ? alt / wert : 0, reichweite: wert / Math.max(1, umsatz * 0.6),
      fehlmenge: Math.max(0, umsatz * 0.6 * 8 - wert), umsatz: eur(umsatz) };
  });
  const plaene = WG_DEF.filter(d => !!s.einkauf.wgs[d.id]).map(d => {
    const st = s.einkauf.wgs[d.id];
    const sid = saisonId(s.woche + 30);
    const limit = limitFuer(s, st, sid);
    const plan = w?.plaene[`${d.id}|${sid}`];
    return { wg: d.id, name: d.name, saison: sid, saisonName: saisonName(s, sid),
      budget: plan?.budget ?? eur(limit.plan * st.st.limitFaktor), verbraucht: eur(limit.verbraucht),
      zielmarge: plan?.zielmarge ?? (st.nosAnteil * st.margeNos + (1 - st.nosAnteil) * st.margeSaison),
      zielabverkauf: plan?.zielabverkauf ?? 0.75, breite: plan?.breite ?? 0.5,
      vororderquote: plan?.vororderquote ?? st.st.vororderquote };
  });
  const kalender = WG_DEF.filter(d => !!s.einkauf.wgs[d.id]).map(d => {
    const st = s.einkauf.wgs[d.id];
    const sid = saisonId(s.woche);
    const lauf = st.saisons[String(sid)];
    const quote = lauf ? lauf.abverkauf / Math.max(1, lauf.eingang) : 0;
    const stufe = quote < 0.35 ? 0 : quote < 0.55 ? 0.2 : quote < 0.75 ? 0.3 : quote < 0.9 ? 0.5 : 1;
    return { wg: d.id, name: d.name, saison: sid, abverkauf: quote, stufe,
      strategie: st.st.reduzierung, lokal: cluster.map(c => ({ cluster: c.id, punkte: w?.lokal[`${d.bereich}|${c.id}`] ?? 0,
        gesperrt: reduzierungGesperrt(s, d.bereich, c.id) })) };
  });
  return { cluster, plaene, kalender, allokationQualitaet: w?.allokationQualitaet ?? 1,
    konzernbestand: eur(s.bestand.reduce((a, k) => a + k.wert, 0)),
    clusterbestand: eur(s.bestand.reduce((a, k) => a + k.wert, 0)),
    umlagerungen: w?.umlagerungen.map(t => ({ gruppe: t.gruppe, von: t.von, nach: t.nach, wert: eur(t.kohorten.reduce((a, k) => a + k.wert, 0)), ankunft: t.ankunft })) ?? [],
    fundus: { eigen: w?.fundusEigen ?? 0, fremd: w?.fundusFremd ?? 0,
      quote: (w?.fundusEigen ?? 0) / Math.max(1, (w?.fundusEigen ?? 0) + (w?.fundusFremd ?? 0)),
      frequenzFaktor: fundusFrequenzFaktor(s) },
    vorlagen: w?.vorlagen.filter(v => !v.erledigt) ?? [] };
}
export function warenHaus(s: GameState, h: Haus) {
  const c = hausclusterId(h);
  const bs = s.bestand.filter(k => k.hauscluster === c);
  const wert = bs.reduce((a, k) => a + k.wert, 0);
  const alt = bs.filter(k => k.ladenhueter || k.alter > (k.art === 'nos' ? EK_PARAM.altNos : EK_PARAM.altSaison)).reduce((a, k) => a + k.wert, 0);
  const betr = h.flaechen.filter(f => f.konzept === 'eigen' && !(f.umbauBis && f.umbauBis > s.woche)).reduce((a, f) => a + f.qm, 0);
  return { hauscluster: c, verfuegbarkeit: wert ? clamp(wert / Math.max(1, (h.kpi?.umsatz ?? 1) * 7), 0, 1) : 0,
    altwareanteil: wert ? alt / wert : 0, inventur: s.ware?.inventur[h.id],
    flaechenproduktivitaet: (h.kpi?.umsatz ?? 0) / Math.max(1, betr) };
}
export function wareAktion(s: GameState, a: WareAktion): { ok: boolean; text: string } {
  if (!s.ware) initialisiereWare(s);
  const w = s.ware!;
  const fehler = (text: string) => ({ ok: false, text });
  const ok = (text: string) => ({ ok: true, text });
  switch (a.typ) {
    case 'allokationQualitaet':
      if (!Number.isFinite(a.qualitaet) || a.qualitaet < 0 || a.qualitaet > 1) return fehler('Qualität muss zwischen 0 und 1 liegen.');
      w.allokationQualitaet = a.qualitaet; w.steuerungAktiv = true;
      // Bereits vorhandene Ware neu verteilen, damit eine schwache Allokation sofort sichtbare
      // Fehlmengen und Überhänge erzeugt. Der Konzernwert bleibt centgenau erhalten.
      const gruppiert = new Map<string, Kohorte>();
      for (const k of s.bestand) {
        const key = [k.gruppe, k.wg, k.art, k.marke, k.alter, k.saisonId, k.kostenFaktor, k.ladenhueter].join('|');
        const x = gruppiert.get(key);
        if (x) x.wert += k.wert;
        else gruppiert.set(key, { ...k, wert: k.wert });
      }
      s.bestand = [...gruppiert.values()].flatMap(k => verteile(s, k, schiefe(gewichte(s, k.gruppe), a.qualitaet)));
      return ok('Allokation und Nachschub angepasst.');
    case 'umlagerung': {
      const cl = clusterListe(s).map(x => x.id);
      if (!cl.includes(a.von) || !cl.includes(a.nach) || a.von === a.nach) return fehler('Ungültiges Quell- oder Zielcluster.');
      if (!GRUPPEN[a.gruppe] || !Number.isSafeInteger(a.wert) || a.wert <= 0) return fehler('Ungültiger Warenwert.');
      const pool = s.bestand.filter(k => k.gruppe === a.gruppe && k.hauscluster === a.von && k.wert > 0).sort((x, y) => y.alter - x.alter);
      if (pool.reduce((x, k) => x + k.wert, 0) < a.wert) return fehler('Zu wenig Ware im Quellcluster.');
      let rest = a.wert;
      const kohorten: Kohorte[] = [];
      for (const k of pool) {
        if (rest <= 0) break;
        const x = Math.min(rest, k.wert);
        k.wert -= x; rest -= x;
        kohorten.push({ ...k, wert: x });
      }
      s.bestand = s.bestand.filter(k => k.wert > 0);
      const kosten = eur(Math.max(1500, a.wert * 0.015));
      s.einmalkostenWoche += kosten;
      w.umlagerungen.push({ gruppe: a.gruppe, von: a.von, nach: a.nach, kohorten, kosten, ankunft: s.woche + (a.wert > 250_000 ? 2 : 1) });
      w.steuerungAktiv = true;
      return ok('Umlagerung beauftragt; Ankunft in ein bis zwei Wochen.');
    }
    case 'reduzierungZentral': {
      const key = `${a.gruppe ?? '*'}|${a.hauscluster ?? '*'}`;
      if (a.gruppe && !GRUPPEN[a.gruppe]) return fehler('Warengruppe nicht gefunden.');
      if (a.hauscluster && !clusterListe(s).some(c => c.id === a.hauscluster)) return fehler('Hauscluster nicht gefunden.');
      if (a.an) w.zentral[key] = true; else delete w.zentral[key];
      if (a.an) for (const c of clusterListe(s)) {
        if (a.hauscluster && a.hauscluster !== c.id) continue;
        // Gute Leitungen nehmen die Zentralisierung stärker persönlich.
        const leitungen = (s as GameState & { organisation?: { hauscluster: { id: string; stelle: { person?: { qualitaet: number; stimmung: number } } }[] } }).organisation?.hauscluster;
        const leitung = leitungen?.find(x => x.id === c.id)?.stelle.person;
        if (leitung) leitung.stimmung = Math.max(0, leitung.stimmung - (leitung.qualitaet >= 0.7 ? 10 : 5));
      }
      return ok(a.an ? 'Zentraler Reduzierungskalender durchgesetzt.' : 'Lokaler Reduzierungsspielraum freigegeben.');
    }
    case 'reduzierungLokal':
      if (!GRUPPEN[a.gruppe] || !clusterListe(s).some(c => c.id === a.hauscluster)) return fehler('Bereich oder Hauscluster unbekannt.');
      if (reduzierungGesperrt(s, a.gruppe, a.hauscluster)) return fehler('Der zentrale Reduzierungskalender sperrt lokale Nachlässe.');
      if (!Number.isFinite(a.punkte) || a.punkte < 0 || a.punkte > 10) return fehler('Maximal zehn zusätzliche Prozentpunkte.');
      w.lokal[`${a.gruppe}|${a.hauscluster}`] = a.punkte / 100;
      w.steuerungAktiv = true;
      return ok('Lokaler Reduzierungsspielraum aktualisiert.');
    case 'merchandisePlan': {
      const st = s.einkauf.wgs[a.wg];
      if (!st || !Number.isSafeInteger(a.saison) || a.saison < saisonId(s.woche)) return fehler('Saison oder Warengruppe nicht gültig.');
      const alt = w.plaene[`${a.wg}|${a.saison}`];
      const soll = limitFuer(s, st, a.saison);
      const p: WarenPlan = {
        wg: a.wg, saison: a.saison, budget: a.budget ?? alt?.budget ?? eur(soll.plan * st.st.limitFaktor),
        zielmarge: a.zielmarge ?? alt?.zielmarge ?? st.margeSaison,
        zielabverkauf: a.zielabverkauf ?? alt?.zielabverkauf ?? 0.75,
        breite: a.breite ?? alt?.breite ?? 0.5,
        vororderquote: a.vororderquote ?? alt?.vororderquote ?? st.st.vororderquote,
      };
      if (!Number.isSafeInteger(p.budget) || p.budget < 0 || p.zielmarge < 0 || p.zielmarge > 1 ||
          p.zielabverkauf < 0 || p.zielabverkauf > 1 || p.breite < 0 || p.breite > 1 || p.vororderquote < 0 || p.vororderquote > 1) return fehler('Ungültige Planparameter.');
      w.plaene[`${a.wg}|${a.saison}`] = p;
      st.st.limitEuro = p.budget; st.st.vororderquote = p.vororderquote;
      for (const v of w.vorlagen) if (v.wg === a.wg && v.saison === a.saison) v.erledigt = true;
      return ok('Saisonbudget und Vororderquote übernommen.');
    }
    case 'fundusAbfluss': {
      if (!GRUPPEN[a.gruppe] || !Number.isSafeInteger(a.wert) || a.wert <= 0) return fehler('Ungültiger Warenwert.');
      const ks = s.bestand.filter(k => k.gruppe === a.gruppe && k.wert > 0 &&
        (k.ladenhueter || k.alter > (k.art === 'nos' ? EK_PARAM.altNos : EK_PARAM.altSaison))).sort((x, y) => y.alter - x.alter);
      if (ks.reduce((x, k) => x + k.wert, 0) < a.wert) return fehler('Nicht genug Altware vorhanden.');
      let rest = a.wert, ek = 0;
      for (const k of ks) {
        const x = Math.min(k.wert, rest);
        k.wert -= x; rest -= x; ek += x * k.kostenFaktor;
        if (rest <= 0) break;
      }
      s.bestand = s.bestand.filter(k => k.wert > 0.5);
      w.fundusEigen += a.wert;
      const erloes = eur(a.wert * 0.7);
      s.einmalErloeseWoche += erloes;
      s.einmalkostenWoche += eur(ek);
      return ok(`${erloes.toLocaleString('de-DE')} € Erlös durch Abfluss an FUNDUS gebucht.`);
    }
    case 'flaechenZuteilung': {
      const h = s.haeuser.find(h => h.id === a.haus);
      if (!h || h.status !== 'offen') return fehler('Haus nicht verfügbar.');
      if (a.von === a.nach || !GRUPPEN[a.nach] || GRUPPEN[a.nach].format !== h.format || !Number.isSafeInteger(a.qm) || a.qm < 50) return fehler('Unzulässige Flächenänderung.');
      const f = h.flaechen.find(f => f.gruppe === a.von && f.konzept === 'eigen' && f.umbauBis === undefined && f.qm >= a.qm);
      if (!f) return fehler('Nicht genügend freie Eigenfläche.');
      const wochen = clamp(Math.ceil(a.qm / 200) + 1, 2, 6);
      const kosten = eur(a.qm * 180);
      f.qm -= a.qm;
      h.flaechen.push({ id: `${h.id}-ware-${++s.zaehler}`, etage: f.etage, qm: a.qm,
        konzept: 'eigen', gruppe: a.von, umbauBis: s.woche + wochen, umbauZiel: { konzept: 'eigen', gruppe: a.nach } });
      s.einmalkostenWoche += kosten;
      return ok(`${a.qm} qm umgeplant, Umbauzeit ${wochen} Wochen.`);
    }
    case 'warensicherung': {
      const h = s.haeuser.find(h => h.id === a.haus) as ClusterHaus | undefined;
      if (!h) return fehler('Haus nicht gefunden.');
      h.warensicherung = a.an;
      if (a.an) s.einmalkostenWoche += 25_000;
      w.steuerungAktiv = true;
      return ok(a.an ? 'Warensicherung installiert.' : 'Warensicherung deaktiviert.');
    }
   }
  return fehler('Unbekannte Warenaktion.');
}

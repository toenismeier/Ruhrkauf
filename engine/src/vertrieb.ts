// Q07: deterministischer Vorjahresvorlauf und Vertriebssteuerung. Reine Abfragen, keine Spielaktionen.
import { GRUPPEN, saisonFaktor } from './daten';
import { planWoche } from './planung';
import type { GameState, Haus, Region, GruppeId } from './types';
import { eur } from './util';
import { hausKosten, simuliereHaus } from './wirtschaft';

export interface VorjahrWoche {
  woche: number;
  umsatz: number;
  db: number;
  frequenz: number;
  kaeufe: number;
  artikel: number;
  personal: number;
  miete: number;
}
export type VertriebsFormat = 'alle' | 'warenhaus' | 'schwester' | 'sport' | 'outlet';
export type VertriebsZeitraum = 'woche' | 'vier' | 'monat' | 'quartal' | 'ytd';
export type VertriebsEbene = 'alle' | 'region' | 'hauscluster' | 'haus';
export interface VertriebsKennzahlen {
  anzahl: number;
  offen: number;
  umsatz: number;
  umsatzYtd: number;
  vorjahr?: number;
  abweichung?: number;
  abweichungProzent?: number;
  ebitda: number;
  ebitdaQuote?: number;
  vorjahrEbitda?: number;
  vorjahrEbitdaQuote?: number;
  plan: number;
  planAbweichung?: number;
  frequenz: number;
  kaufquote: number;
  bon: number;
  personalquote: number;
  mietquote: number;
  ampel: 'gruen' | 'gelb' | 'rot' | 'ohne';
  vorjahrGeschaetzt: boolean;
}
export interface VertriebsZeile extends VertriebsKennzahlen {
  id: string;
  name: string;
  ebene: 'region' | 'hauscluster' | 'haus';
  format?: VertriebsFormat;
  region?: Region;
  stadt?: string;
  nurDaten?: boolean;
}
export interface VertriebsUebersicht {
  ebene: VertriebsEbene;
  id?: string;
  format: VertriebsFormat;
  zeitraum: VertriebsZeitraum;
  von: number;
  bis: number;
  titel: string;
  gesamt: VertriebsKennzahlen;
  formate: VertriebsZeile[];
  zeilen: VertriebsZeile[];
}

/** Für jede Filiale 52 Vorlaufwochen; Auswertung im Prognosemodus ohne RNG-Ziehung
 * aus dem Spielstand. Weder Buchungslogik noch Liquidität werden fortgeschrieben.
 * Dies sind simulierte Vergleichswerte vor dem Amtsantritt, keine späteren IST-Werte.
 */
export function erzeugeVorjahrHistorie(s: GameState, nurFehlende = false): void {
  const start = s.spielStartWoche ?? 0;
  const vorherRng = s.rng;
  const historien: Record<string, VorjahrWoche[]> = nurFehlende ? { ...(s.vorjahrHistorie ?? {}) } : {};
  const simulation: GameState = { ...s, prognose: true, rng: vorherRng };
  for (const h of s.haeuser) {
    if (nurFehlende && historien[h.id]?.length) continue;
    const wochen: VorjahrWoche[] = [];
    if (h.nurDaten || h.status === 'verkauft') { historien[h.id] = wochen; continue; }
    const qm = h.flaechen.filter((f) => f.konzept === 'eigen' || f.konzept === 'kommission' || f.konzept === 'offprice').reduce((v, f) => v + f.qm, 0);
    // Leistung: simuliereHaus nur an vier Stützwochen (je Quartal), dazwischen je
    // Warengruppe über den Saisonfaktor skaliert. Spart rund 90 % der Startzeit.
    const stuetzen = [6, 19, 32, 45].map((i) => {
      simulation.woche = start - 52 + i + 52;
      return { i, roh: simuliereHaus(simulation, h) };
    });
    for (let i = 0; i < 52; i++) {
      const woche = start - 52 + i;
      // +52: gleiches Saisonprofil wie in der Folgesaison, niemals negative Laufzeiten.
      simulation.woche = woche + 52;
      const st = stuetzen.reduce((a, b) => Math.abs(b.i - i) < Math.abs(a.i - i) ? b : a);
      const roh = st.roh, wSt = start - 52 + st.i + 52;
      const f = (g: GruppeId) => saisonFaktor(g, woche + 52) / Math.max(1e-6, saisonFaktor(g, wSt));
      let eigenSt = 0, eigenJetzt = 0;
      let umsatz = 0, rohertrag = 0, eigen = 0, artikel = 0;
      for (const [g, v] of Object.entries(roh.eigen) as [GruppeId, { umsatz: number }][]) {
        const u = v.umsatz * f(g);
        eigenSt += v.umsatz; eigenJetzt += u;
        umsatz += u; eigen += u;
        rohertrag += u * GRUPPEN[g].marge;
        artikel += u / 40;
      }
      const off = roh.offprice * (eigenSt > 0 ? eigenJetzt / eigenSt : 1);
      umsatz += off; eigen += off; rohertrag += off * 0.30; artikel += off / 24;
      for (const [g, wert] of Object.entries(roh.kommission) as [GruppeId, number][]) {
        const u = wert * f(g);
        umsatz += u; rohertrag += u * 0.25;
        artikel += u / 40;
      }
      const kosten = hausKosten(simulation, h, eigen, umsatz);
      const konzession = roh.konzessionUmsatz * 0.17;
      const db = rohertrag + konzession + roh.untermiete -
        kosten.personal - kosten.miete - kosten.nebenkosten - kosten.sonstige - kosten.logistik;
      const frequenz = umsatz > 0 ? Math.max(1, eur((qm * 1.12 + 4400) * 0.95)) : 0;
      const kaeufe = frequenz * (h.format === 'outlet' ? 0.35 : h.format === 'sport' ? 0.22 : 0.25);
      wochen.push({ woche, umsatz: eur(umsatz), db: eur(db), frequenz, kaeufe,
        artikel: eur(artikel), personal: eur(kosten.personal), miete: eur(kosten.miete) });
    }
    historien[h.id] = wochen;
  }
  s.vorjahrHistorie = historien;
  // Kein Zufallsverbrauch und keine Rückwirkung auf den nächsten Wochenabschluss.
  s.rng = vorherRng;
}

export function mietvertragEmpfehlung(h: Haus, markt: number): 'verlaengern' | 'nachverhandeln' | 'auslaufen' {
  // Keine automatische Schließung nur aufgrund einer Wochenabweichung.
  return h.kpi?.db !== undefined && h.kpi.db < 0 && markt > h.miete.mieteWoche ||
    markt > h.miete.mieteWoche * 1.08 ? 'nachverhandeln' : 'verlaengern';
}

const hausgruppe = (h: Haus): string => h.hauscluster ?? h.region;
const formatName = (format: VertriebsFormat): string => ({
  alle: 'Alle Formate', warenhaus: 'Warenhaus', schwester: 'Volkskauf',
  sport: 'Hartwig Sport', outlet: 'FUNDUS',
})[format];

export function vertriebUebersicht(s: GameState, filter: {
  ebene?: VertriebsEbene; id?: string; format?: VertriebsFormat; zeitraum?: VertriebsZeitraum;
} = {}): VertriebsUebersicht {
  const ebene = filter.ebene ?? 'alle';
  const format = filter.format ?? 'alle';
  const zeitraum = filter.zeitraum ?? 'woche';
  const bis = s.woche - 1, kalender = ((bis % 52) + 52) % 52;
  const von = zeitraum === 'vier' ? bis - 3 :
    zeitraum === 'monat' ? bis - (kalender - Math.floor(Math.floor(kalender * 12 / 52) * 52 / 12)) :
    zeitraum === 'quartal' ? bis - (kalender % 13) :
    zeitraum === 'ytd' ? bis - kalender : bis;
  const jahrStart = bis - kalender;
  const start = s.spielStartWoche ?? 0;
  const alle = s.haeuser.filter((h) => h.status !== 'verkauft');
  const gruppe = alle.filter((h) => format === 'alle' || h.format === format)
    .filter((h) => ebene === 'alle' || !filter.id ||
      ebene === 'region' && h.region === filter.id ||
      ebene === 'hauscluster' && hausgruppe(h) === filter.id ||
      ebene === 'haus' && h.id === filter.id);
  const historische = (h: Haus, w: number): VorjahrWoche | undefined => {
    if (w < start) return s.vorjahrHistorie?.[h.id]?.find((v) => v.woche === w);
    const echt = h.verlauf?.find((v) => v.woche === w);
    if (echt) {
      const t = h.treiberVerlauf?.find((v) => v.von === w && v.bis === w);
      const q = t?.kaeufe ?? echt.umsatz / 45;
      return { woche: w, umsatz: echt.umsatz, db: echt.db, frequenz: t?.frequenz ?? echt.frequenz,
        kaeufe: q, artikel: t?.artikel ?? q * 1.7, personal: h.kpi?.woche === w ? h.kpi.personal : 0,
        miete: h.kpi?.woche === w ? h.kpi.miete : h.miete.mieteWoche };
    }
    if (h.kpi?.woche === w) {
      const t = h.treiberVerlauf?.find((v) => v.von === w && v.bis === w);
      return { woche: w, umsatz: h.kpi.umsatz, db: h.kpi.db, frequenz: t?.frequenz ?? 0,
        kaeufe: t?.kaeufe ?? 0, artikel: t?.artikel ?? 0, personal: h.kpi.personal, miete: h.kpi.miete };
    }
    return undefined;
  };
  const summe = (hs: Haus[]): VertriebsKennzahlen => {
    let umsatz = 0, umsatzYtd = 0, vj = 0, ebitda = 0, vjDb = 0, plan = 0;
    let fre = 0, kaeufe = 0, personal = 0, miete = 0;
    let vjVorhanden = 0, aktiv = 0, geschaetzt = false;
    for (const h of hs) {
      if (h.nurDaten) continue;
      aktiv++;
      const bisIst = Math.max(start, von);
      for (let w = bisIst; w <= bis; w++) {
        const p = historische(h, w);
        if (!p) continue;
        umsatz += p.umsatz; ebitda += p.db; fre += p.frequenz; kaeufe += p.kaeufe;
        personal += p.personal; miete += p.miete;
        plan += planWoche(s, h.id, w);
      }
      for (let w = Math.max(start, jahrStart); w <= bis; w++) umsatzYtd += historische(h, w)?.umsatz ?? 0;
      let voll = bis >= start;
      for (let w = bisIst; w <= bis; w++) {
        const p = historische(h, w - 52);
        if (!p) { voll = false; break; }
        vj += p.umsatz; vjDb += p.db;
        geschaetzt ||= !h.treiberVerlauf?.some((v) => v.von === w - 52 && v.bis === w - 52);
      }
      if (voll && von >= start) vjVorhanden++;
    }
    const mitVj = aktiv > 0 && vjVorhanden === aktiv && bis >= start;
    const vorjahr = mitVj ? eur(vj) : undefined;
    const abweichung = vorjahr === undefined ? undefined : eur(umsatz) - vorjahr;
    const abweichungProzent = vorjahr && abweichung !== undefined ? abweichung / Math.abs(vorjahr) : undefined;
    const ebitdaQuote = umsatz > 0 ? ebitda / umsatz : undefined;
    const vorjahrEbitdaQuote = vj > 0 && mitVj ? vjDb / vj : undefined;
    return { anzahl: hs.length, offen: hs.filter((h) => h.status === 'offen').length,
      umsatz: eur(umsatz), umsatzYtd: eur(umsatzYtd),
      vorjahr, abweichung, abweichungProzent, ebitda: eur(ebitda), ebitdaQuote,
      vorjahrEbitda: mitVj ? eur(vjDb) : undefined, vorjahrEbitdaQuote,
      plan: eur(plan), planAbweichung: plan > 0 ? (umsatz - plan) / plan : undefined,
      frequenz: eur(fre), kaufquote: fre > 0 ? kaeufe / fre : 0, bon: kaeufe > 0 ? umsatz / kaeufe : 0,
      personalquote: umsatz > 0 ? personal / umsatz : 0, mietquote: umsatz > 0 ? miete / umsatz : 0,
      ampel: !aktiv || !umsatz ? 'ohne' : abweichungProzent === undefined ? ebitda < 0 ? 'rot' : 'gelb' :
        abweichungProzent < -0.05 ? 'rot' : abweichungProzent < 0 ? 'gelb' : 'gruen',
      vorjahrGeschaetzt: mitVj && geschaetzt,
    };
  };
  const fmt = (h: Haus) => h.format;
  const formate: VertriebsZeile[] = (['warenhaus','schwester','sport','outlet'] as VertriebsFormat[])
    .map((f) => ({ id: f, name: formatName(f), ebene: 'region' as const, format: f,
      ...summe(gruppe.filter((h) => fmt(h) === f)) }));
  const ebenen: VertriebsZeile['ebene'] = ebene === 'alle' ? 'region' :
    ebene === 'region' ? 'hauscluster' : 'haus';
  const gruppen = new Map<string, Haus[]>();
  for (const h of gruppe) {
    const key = ebene === 'alle' ? h.region :
      ebene === 'region' ? hausgruppe(h) : h.id;
    const eintrag = gruppen.get(key) ?? [];
    eintrag.push(h); gruppen.set(key, eintrag);
  }
  const zeilen: VertriebsZeile[] = [...gruppen].map(([id, hs]) => ({
    id, name: ebene === 'alle' ? 'Region ' + id :
      ebene === 'region' ? s.organisation?.hauscluster.find((c) => c.id === id)?.name ?? id :
      hs[0].name, ebene: ebenen, region: hs[0].region,
    ...(ebene !== 'alle' && ebene !== 'region' ? { stadt: hs[0].stadt, nurDaten: !!hs[0].nurDaten } : {}),
    ...summe(hs),
  })).sort((a, b) => (a.abweichungProzent ?? Infinity) - (b.abweichungProzent ?? Infinity) ||
    a.name.localeCompare(b.name, 'de'));
  const titel = ebene === 'alle' ? 'Alle Regionen' :
    ebene === 'region' ? 'Region ' + filter.id :
    ebene === 'hauscluster' ? s.organisation?.hauscluster.find((c) => c.id === filter.id)?.name ?? String(filter.id) :
    gruppe[0]?.name ?? String(filter.id);
  return { ebene, id: filter.id, format, zeitraum, von, bis, titel,
    gesamt: summe(gruppe), formate, zeilen };
}

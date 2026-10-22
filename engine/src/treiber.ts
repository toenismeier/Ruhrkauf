// O02 Umsatztreiber. Die Zerlegung erklärt den gebuchten Umsatz; sie ersetzt nicht die Warenwirtschaft.
import { saisonFaktor } from './daten';
import { marketingHausFaktor } from './marketing';
import type { GameState, GruppeId, Haus } from './types';
import type { HausRoh } from './wirtschaft';
import { clamp, eur } from './util';

export type TreiberId = 'frequenz' | 'kaufquote' | 'bon';
export interface TreiberFaktoren { frequenz: number; kaufquote: number; bon: number }
export type TreiberQuellen = Record<string, Partial<TreiberFaktoren>>;
export interface TreiberPeriode {
  von: number;
  bis: number;
  umsatz: number;
  frequenz: number;
  kaeufe: number;
  artikel: number;
  kaufquote: number;
  bon: number;
  teile: number;
  preis: number;
}
export interface TreiberVergleich {
  aktuell: TreiberPeriode;
  vorjahr?: TreiberPeriode;
  vorjahrGeschaetzt: boolean;
  abweichung?: number;
}
export interface Umsatzbruecke {
  status: 'ok' | 'kein Plan vorhanden' | 'kein Vorjahr vorhanden';
  vorher: number;
  aktuell: number;
  differenz: number;
  frequenz: number;
  kaufquote: number;
  teile: number;
  preis: number;
  bon: number;
  vorjahrGeschaetzt: boolean;
}
export type Ebene = 'konzern' | 'region' | 'hauscluster' | 'haus';
export type RankingKennzahl = 'umsatz' | 'umsatzJeQm' | 'frequenz' | 'kaufquote' | 'bon' | 'abweichungVorjahr';
export interface RankingZeile {
  hausId: string; name: string; region: string; hauscluster: string; format: string;
  wert: number; rangGesamt: number; rangVergleich: number;
}
export interface ReportingZeile {
  id: string; name: string; region: string; hauscluster: string; format: string;
  umsatz: number; vorjahr?: number; abweichung?: number; abweichungProzent?: number;
  frequenz: number; kaufquote: number; bon: number; ampelfarbe: 'gruen' | 'gelb' | 'rot' | 'grau';
}
export interface ReportingGruppe extends Omit<ReportingZeile, 'format'> { ebene: 'region' | 'hauscluster'; format: 'alle' }
export interface Reporting {
  wochen: number;
  bruecke: Umsatzbruecke;
  zeilen: ReportingZeile[];
  gruppen: ReportingGruppe[];
  beobachtung: { hausId: string; name: string; abweichung: number; haupttreiber: string }[];
}
const NULL: TreiberFaktoren = { frequenz: 1, kaufquote: 1, bon: 1 };
// Modellierte Durchschnittspreise aus der Warengruppenstruktur; keine zusätzliche Umsatzbuchung.
const PREIS: Partial<Record<GruppeId, number>> = {
  damen: 43, herren: 49, kinder: 25, beauty: 37, accessoires: 53, waesche: 21,
  wohnen: 39, spielwaren: 27, food: 16, sport: 48, sportschuhe: 85,
  sporttextil: 49, outdoor: 110, rad: 260, wintersport: 115, teamsport: 37,
};
const leer = (): TreiberPeriode => ({
  von: 0, bis: 0, umsatz: 0, frequenz: 0, kaeufe: 0, artikel: 0,
  kaufquote: 0, bon: 0, teile: 0, preis: 0,
});
function komplett(von: number, bis: number, umsatz: number, frequenz: number, kaeufe: number, artikel: number): TreiberPeriode {
  return { von, bis, umsatz, frequenz, kaeufe, artikel,
    kaufquote: frequenz ? kaeufe / frequenz : 0,
    bon: kaeufe ? umsatz / kaeufe : 0,
    teile: kaeufe ? artikel / kaeufe : 0,
    preis: artikel ? umsatz / artikel : 0,
  };
}
const hauscluster = (h: Haus): string => (h as Haus & { hauscluster?: string }).hauscluster || h.region;

/** Jede Quelle ist unabhängig. Faktor 1 entfernt ihren Einfluss; ein leerer Quellenname ist unzulässig. */
export function setzeTreiber(s: GameState, hausId: string, quelle: string, treiber: TreiberId, faktor: number): void {
  const h = s.haeuser.find((x) => x.id === hausId);
  if (!h) throw new Error('Haus nicht gefunden: ' + hausId);
  if (!quelle.trim()) throw new Error('Treiberquelle fehlt.');
  if (!Number.isFinite(faktor) || faktor < 0 || faktor > 3) throw new Error('Treiberfaktor muss zwischen 0 und 3 liegen.');
  const quellen = (h.treiberQuellen ??= {});
  if (faktor === 1) {
    if (quellen[quelle]) {
      delete quellen[quelle][treiber];
      if (!Object.keys(quellen[quelle]).length) delete quellen[quelle];
    }
  } else (quellen[quelle] ??= {})[treiber] = faktor;
  const produkt: TreiberFaktoren = { ...NULL };
  for (const eintrag of Object.values(quellen)) for (const id of ['frequenz', 'kaufquote', 'bon'] as TreiberId[])
    produkt[id] *= eintrag[id] ?? 1;
  h.treiber = produkt;
}
export function treiberFaktor(h: Haus): TreiberFaktoren {
  if (!h.treiberQuellen) return h.treiber ?? NULL;
  const produkt: TreiberFaktoren = { ...NULL };
  for (const q of Object.values(h.treiberQuellen)) for (const t of ['frequenz', 'kaufquote', 'bon'] as TreiberId[])
    produkt[t] *= q[t] ?? 1;
  return produkt;
}
/** Greift vor der Bestandsprüfung auf alle Absatzkanäle zu; ohne Quellen bleibt die Rechnung identisch. */
export function wirkeTreiber(h: Haus, roh: HausRoh): HausRoh {
  const f = treiberFaktor(h);
  const faktor = f.frequenz * f.kaufquote * f.bon;
  if (faktor === 1) return roh;
  for (const v of Object.values(roh.eigen)) if (v) { v.brutto *= faktor; v.umsatz *= faktor; }
  for (const g of Object.keys(roh.kommission) as GruppeId[]) roh.kommission[g] = (roh.kommission[g] ?? 0) * faktor;
  roh.offprice *= faktor;
  roh.ohneAktion *= faktor;
  roh.ohneAktionRohertrag *= faktor;
  return roh;
}
function frequenzBasis(s: GameState, h: Haus): number {
  const qm = h.flaechen.filter((f) => f.konzept !== 'leer' && f.konzept !== 'untermiete').reduce((sum, f) => sum + f.qm, 0);
  const lage = { '1a': 1.12, b: 0.87, center: 1.07, rand: 0.79 }[h.lage];
  const groesse = { metropole: 1.16, grossstadt: 1, mittelstadt: 0.84 }[h.cluster];
  const saison = clamp(saisonFaktor('damen', s.woche), 0.65, 1.75);
  const marketing = marketingHausFaktor(s, h);
  return Math.max(0, Math.round((Math.max(0, qm) * 1.12 + 4400) * lage * groesse *
    clamp(h.einzug.kaufkraft, 0.7, 1.4) * saison * marketing * (1 + h.transferBonus)));
}
function kaufquoteBasis(h: Haus): number {
  if ((h.format as string) === 'fundus') return 0.35;
  if (h.format === 'sport') return 0.215;
  return h.klasse === 'premium' ? 0.29 : h.lage === '1a' ? 0.27 : h.lage === 'rand' ? 0.22 : 0.25;
}
function artikelAusMix(h: Haus, umsatz: number): number {
  const gruppen = Object.entries(h.kpi?.umsatzJeGruppe ?? {}) as [GruppeId, number][];
  const mengen = gruppen.reduce((sum, [g, wert]) => sum + Math.max(0, wert) / (PREIS[g] ?? 40), 0);
  const rest = Math.max(0, umsatz - gruppen.reduce((sum, [, v]) => sum + v, 0));
  return umsatz > 0 ? Math.max(0.000001, mengen + rest / 18) : 0;
}
/** Wird genau einmal nach der Buchung der Haus-KPI pro Woche aufgerufen. */
export function erfasseTreiber(s: GameState): void {
  if (s.prognose || s.treiberErfassungAus) return;
  for (const h of s.haeuser) {
    const umsatz = h.kpi?.woche === s.woche ? h.kpi.umsatz : 0;
    const f = treiberFaktor(h);
    const frequenz = h.status !== 'geschlossen' && h.status !== 'verkauft' ? Math.max(1, Math.round(frequenzBasis(s, h) * f.frequenz)) : 0;
    const q = umsatz > 0 ? clamp(kaufquoteBasis(h) * f.kaufquote, 0.01, 0.95) : 0;
    const kaeufe = frequenz * q;
    const artikel = artikelAusMix(h, umsatz);
    const messung = komplett(s.woche, s.woche, umsatz, frequenz, kaeufe, artikel);
    const verlauf = (h.treiberVerlauf ??= []);
    verlauf.push(messung);
    // Nach dem ersten Jahr: die älteren 52 Wochen in 4-Wochen-Blöcken speichern.
    const grenze = s.woche - 51;
    const erste = s.woche - 103;
    // Alte 4-Wochen-Blöcke am 104-Wochen-Rand proportional abschneiden.
    const zuschneiden = (p: TreiberPeriode): TreiberPeriode => {
      if (p.von >= erste) return p;
      const anteil = (p.bis - erste + 1) / (p.bis - p.von + 1);
      return komplett(erste, p.bis, p.umsatz * anteil, p.frequenz * anteil,
        p.kaeufe * anteil, p.artikel * anteil);
    };
    const alt = verlauf.filter((p) => p.bis < grenze && p.bis >= erste).map(zuschneiden);
    const jung = verlauf.filter((p) => p.bis >= grenze).map((p) => p.von < erste ? zuschneiden(p) : p);
    const bloecke = new Map<number, TreiberPeriode[]>();
    for (const p of alt) {
      const block = Math.floor(p.von / 4);
      const gruppe = bloecke.get(block) ?? [];
      gruppe.push(p); bloecke.set(block, gruppe);
    }
    const archiv = [...bloecke.entries()].sort((a, b) => a[0] - b[0]).map(([, teile]) => summiere(teile));
    h.treiberVerlauf = [...archiv, ...jung];
  }
}
function summiere(eintraege: TreiberPeriode[]): TreiberPeriode {
  if (!eintraege.length) return leer();
  return komplett(Math.min(...eintraege.map((e) => e.von)), Math.max(...eintraege.map((e) => e.bis)),
    eintraege.reduce((s, e) => s + e.umsatz, 0),
    eintraege.reduce((s, e) => s + e.frequenz, 0),
    eintraege.reduce((s, e) => s + e.kaeufe, 0),
    eintraege.reduce((s, e) => s + e.artikel, 0));
}
function zeitraum(s: GameState, h: Haus, von: number, bis: number): { wert?: TreiberPeriode; geschaetzt: boolean } {
  const start = s.spielStartWoche ?? 0;
  const historisch = (s.vorjahrHistorie?.[h.id] ?? []).map((p) => komplett(p.woche, p.woche, p.umsatz, p.frequenz, p.kaeufe, p.artikel));
  const messungen = [...historisch, ...(h.treiberVerlauf ?? [])];
  if (von < start - 52 || bis < von) return { geschaetzt: false };
  const teile: TreiberPeriode[] = [];
  let abgedeckt = 0, geschaetzt = false;
  for (const m of messungen) {
    const gemeinsam = Math.max(0, Math.min(bis, m.bis) - Math.max(von, m.von) + 1);
    if (!gemeinsam) continue;
    const laenge = m.bis - m.von + 1, anteil = gemeinsam / laenge;
    if (anteil !== 1) geschaetzt = true;
    teile.push(komplett(Math.max(von, m.von), Math.min(bis, m.bis),
      m.umsatz * anteil, m.frequenz * anteil, m.kaeufe * anteil, m.artikel * anteil));
    abgedeckt += gemeinsam;
  }
  if (abgedeckt !== bis - von + 1) return { geschaetzt };
  const wert = summiere(teile);
  wert.umsatz = eur(wert.umsatz);
  wert.preis = wert.artikel ? wert.umsatz / wert.artikel : 0;
  wert.bon = wert.kaeufe ? wert.umsatz / wert.kaeufe : 0;
  return { wert, geschaetzt };
}
export function hausTreiber(s: GameState, hausId: string, wochen = 1): TreiberVergleich | undefined {
  const h = s.haeuser.find((x) => x.id === hausId);
  if (!h) return undefined;
  const bis = s.woche - 1;
  const aktuell = zeitraum(s, h, bis - wochen + 1, bis);
  if (!aktuell.wert) return undefined;
  const vorjahr = zeitraum(s, h, bis - wochen + 1 - 52, bis - 52);
  return { aktuell: aktuell.wert, vorjahr: vorjahr.wert,
    vorjahrGeschaetzt: vorjahr.geschaetzt,
    abweichung: vorjahr.wert ? aktuell.wert.umsatz - vorjahr.wert.umsatz : undefined };
}
function auswahl(s: GameState, ebene: Ebene, id?: string, format?: string): Haus[] {
  return s.haeuser.filter((h) => h.status !== 'verkauft' && (!format || format === 'alle' || h.format === format) &&
    (ebene === 'konzern' || (ebene === 'haus' && h.id === id) ||
      (ebene === 'region' && h.region === id) ||
      (ebene === 'hauscluster' && hauscluster(h) === id)));
}
export function umsatzbruecke(s: GameState, o: { ebene: Ebene; id?: string; vergleich: 'vorjahr' | 'plan'; wochen: number; format?: string }): Umsatzbruecke {
  const fehlend = (status: Umsatzbruecke['status']): Umsatzbruecke => ({
    status, vorher: 0, aktuell: 0, differenz: 0, frequenz: 0, kaufquote: 0, teile: 0, preis: 0, bon: 0, vorjahrGeschaetzt: false,
  });
  if (o.vergleich === 'plan') return fehlend('kein Plan vorhanden');
  const ende = s.woche - 1, anzahl = Math.max(1, Math.floor(o.wochen));
  const alt: TreiberPeriode[] = [], neu: TreiberPeriode[] = [];
  let geschaetzt = false;
  for (const h of auswahl(s, o.ebene, o.id, o.format)) {
    const jetzt = zeitraum(s, h, ende - anzahl + 1, ende);
    const frueher = zeitraum(s, h, ende - anzahl + 1 - 52, ende - 52);
    if (!jetzt.wert || !frueher.wert) continue;
    neu.push(jetzt.wert); alt.push(frueher.wert);
    geschaetzt ||= frueher.geschaetzt;
  }
  if (!neu.length) return fehlend('kein Vorjahr vorhanden');
  const v = summiere(alt), a = summiere(neu);
  // Deterministische Reihenfolge; gerundete Zwischenstufen sorgen für eine exakte Euro-Brücke.
  const f = eur(a.frequenz * v.kaufquote * v.teile * v.preis);
  const q = eur(a.frequenz * a.kaufquote * v.teile * v.preis);
  const t = eur(a.frequenz * a.kaufquote * a.teile * v.preis);
  const u = eur(a.umsatz), vorher = eur(v.umsatz);
  const teile = t - q, preis = u - t;
  return { status: 'ok', vorher, aktuell: u, differenz: u - vorher,
    frequenz: f - vorher, kaufquote: q - f, teile, preis, bon: teile + preis,
    vorjahrGeschaetzt: geschaetzt };
}
function kennzahl(s: GameState, h: Haus, id: RankingKennzahl): number {
  const d = hausTreiber(s, h.id);
  if (!d) return 0;
  if (id === 'umsatz') return d.aktuell.umsatz;
  if (id === 'frequenz') return d.aktuell.frequenz;
  if (id === 'kaufquote') return d.aktuell.kaufquote;
  if (id === 'bon') return d.aktuell.bon;
  if (id === 'abweichungVorjahr') return d.abweichung ?? 0;
  const qm = h.flaechen.reduce((sum, f) => sum + f.qm, 0);
  return qm > 0 ? d.aktuell.umsatz / qm : 0;
}
export function ranking(s: GameState, o: {
  kennzahl: RankingKennzahl; ebene: 'alle' | 'region' | 'hauscluster'; innerhalb?: string;
}): RankingZeile[] {
  const alle = s.haeuser.filter((h) => h.status !== 'verkauft' && h.kpi?.woche === s.woche - 1);
  const vergleich = (h: Haus) => o.ebene === 'region' ? h.region : hauscluster(h);
  const gesamt = alle.map((h) => ({ h, wert: kennzahl(s, h, o.kennzahl) }))
    .sort((a, b) => b.wert - a.wert || a.h.id.localeCompare(b.h.id));
  const gruppe = (o.ebene === 'alle' || !o.innerhalb ? gesamt :
    gesamt.filter((e) => vergleich(e.h) === o.innerhalb));
  return gruppe.map((e, index) => ({
    hausId: e.h.id, name: e.h.name, region: e.h.region, hauscluster: hauscluster(e.h), format: e.h.format,
    wert: e.wert, rangGesamt: gesamt.indexOf(e) + 1,
    rangVergleich: o.innerhalb ? index + 1 : gesamt.filter((x) => vergleich(x.h) === vergleich(e.h)).indexOf(e) + 1,
  }));
}
export function reporting(s: GameState, wochen = 1, format = 'alle'): Reporting {
  const zeilen: ReportingZeile[] = [];
  for (const h of s.haeuser) {
    if (h.status === 'verkauft' || (format !== 'alle' && h.format !== format)) continue;
    const d = hausTreiber(s, h.id, wochen);
    if (!d) continue;
    const v = d.vorjahr?.umsatz;
    const diff = d.abweichung;
    const anteil = v && diff !== undefined ? diff / Math.abs(v) : undefined;
    zeilen.push({ id: h.id, name: h.name, region: h.region, hauscluster: hauscluster(h), format: h.format,
      umsatz: d.aktuell.umsatz, vorjahr: v, abweichung: diff, abweichungProzent: anteil,
      frequenz: d.aktuell.frequenz, kaufquote: d.aktuell.kaufquote, bon: d.aktuell.bon,
      ampelfarbe: anteil === undefined ? 'grau' : anteil < -0.05 ? 'rot' : anteil < 0 ? 'gelb' : 'gruen',
    });
  }
  // O02: Aggregation im Engine-Modul, nicht in der Oberfläche.
  const gruppen: ReportingGruppe[] = [];
  for (const ebene of ['region', 'hauscluster'] as const) {
    for (const id of new Set(zeilen.map((z) => z[ebene]))) {
      const aus = zeilen.filter((z) => z[ebene] === id);
      const umsatz = aus.reduce((a, z) => a + z.umsatz, 0);
      const fre = aus.reduce((a, z) => a + z.frequenz, 0);
      const kaeufe = aus.reduce((a, z) => a + z.frequenz * z.kaufquote, 0);
      const mitVj = aus.filter((z) => z.vorjahr !== undefined);
      const vorjahr = mitVj.length === aus.length ? aus.reduce((a, z) => a + (z.vorjahr ?? 0), 0) : undefined;
      const abweichung = vorjahr !== undefined ? umsatz - vorjahr : undefined;
      const abweichungProzent = vorjahr && abweichung !== undefined ? abweichung / Math.abs(vorjahr) : undefined;
      gruppen.push({ id, name: id, region: ebene === 'region' ? id : aus[0].region,
        hauscluster: ebene === 'hauscluster' ? id : '', ebene, format: 'alle',
        umsatz, vorjahr, abweichung, abweichungProzent, frequenz: fre,
        kaufquote: fre ? kaeufe / fre : 0, bon: kaeufe ? umsatz / kaeufe : 0,
        ampelfarbe: abweichungProzent === undefined ? 'grau' : abweichungProzent < -0.05 ? 'rot' : abweichungProzent < 0 ? 'gelb' : 'gruen' });
    }
  }
  const beobachtung = zeilen.filter((z) => z.abweichung !== undefined && z.abweichung < 0)
    .sort((a, b) => (a.abweichung ?? 0) - (b.abweichung ?? 0)).slice(0, 10).map((z) => {
      const br = umsatzbruecke(s, { ebene: 'haus', id: z.id, vergleich: 'vorjahr', wochen });
      const h = s.haeuser.find((x) => x.id === z.id)!;
      const d = hausTreiber(s, h.id, wochen)!;
      const effekte = [
        { v: br.frequenz, name: 'Frequenz', text: d.vorjahr?.frequenz ? ((d.aktuell.frequenz / d.vorjahr.frequenz - 1) * 100).toFixed(1).replace('.', ',') + ' %' : '–' },
        { v: br.kaufquote, name: 'Kaufquote', text: d.vorjahr ? ((d.aktuell.kaufquote - d.vorjahr.kaufquote) * 100).toFixed(1).replace('.', ',') + ' Punkte' : '–' },
        { v: br.bon, name: 'Bon', text: d.vorjahr?.bon ? ((d.aktuell.bon / d.vorjahr.bon - 1) * 100).toFixed(1).replace('.', ',') + ' %' : '–' },
      ].sort((a, b) => a.v - b.v);
      const haupt = effekte[0];
      return { hausId: z.id, name: z.name, abweichung: z.abweichung!, haupttreiber: haupt.name + ' ' + haupt.text };
    });
  return { wochen, bruecke: umsatzbruecke(s, { ebene: 'konzern', vergleich: 'vorjahr', wochen, format }), zeilen, gruppen, beobachtung };
}

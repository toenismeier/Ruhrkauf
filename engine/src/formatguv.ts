/** E53 Etappe 1: Konzern nach Formaten. Umsatz und Haus-EBITDA je Format aus den echten Hauswerten der
 * letzten 52 Wochen (fehlende Wochen vor Spielstart aus dem Vorlauf), Zentrale als Umlage nach Umsatzanteil.
 * Die Umlage ist bewusst einfach; die verursachungsgerechte Umlage folgt mit den Etappen 2 bis 4. */
import type { GameState } from './types';
import { FORMAT_SCHLUESSEL, FORMAT_NAME, formatVon, formatRegionen, type FormatSchluessel } from './formatschluessel';
import { eur } from './util';

export interface FormatGuvZeile {
  format: FormatSchluessel; name: string; haeuser: number; regionen: number; cluster: number;
  umsatz: number; hausEbitda: number; umlageZentrale: number; ergebnis: number; anteilUmsatz: number;
  umsatzWoche: number; hausEbitdaWoche: number;
}
export interface FormatGuv {
  wochen: number; vorlaufWochen: number; umsatz: number; hausEbitda: number; zentrale: number; ergebnis: number;
  umlage: 'umsatz'; zeilen: FormatGuvZeile[];
}

export function konzernNachFormaten(s: GameState, wochen = 52): FormatGuv {
  const bis = s.woche - 1, von = bis - wochen + 1;
  const start = s.spielStartWoche ?? 0;
  const roh = new Map<FormatSchluessel, { umsatz: number; ebitda: number; uw: number; ew: number; n: number }>();
  for (const f of FORMAT_SCHLUESSEL) roh.set(f, { umsatz: 0, ebitda: 0, uw: 0, ew: 0, n: 0 });
  for (const h of s.haeuser) {
    if (h.status !== 'offen') continue;
    const z = roh.get(formatVon(h))!;
    z.n++;
    z.uw += h.kpi?.umsatz ?? 0; z.ew += h.kpi?.db ?? 0;
    const gesehen = new Set<number>();
    for (const v of h.verlauf ?? []) if (v.woche >= von && v.woche <= bis) { z.umsatz += v.umsatz; z.ebitda += v.db; gesehen.add(v.woche); }
    for (const v of s.vorjahrHistorie?.[h.id] ?? []) if (v.woche >= von && v.woche <= bis && v.woche < start && !gesehen.has(v.woche)) {
      z.umsatz += v.umsatz; z.ebitda += v.db;
    }
  }
  const gespielt = s.historie.filter((k) => k.woche >= von && k.woche <= bis);
  const vorlaufWochen = wochen - gespielt.length;
  const zentrale = eur(gespielt.reduce((n, k) => n + k.zentrale, 0) + vorlaufWochen * (s.zentrale?.kostenWoche ?? 0));
  const umsatz = [...roh.values()].reduce((n, z) => n + z.umsatz, 0);
  const cluster = (f: FormatSchluessel) => f === 'premium' ? 1 : (s.organisation?.hauscluster.filter((c) => !c.sonder && c.format === f).length ?? 0);
  let verteilt = 0;
  const zeilen = FORMAT_SCHLUESSEL.map((f, i): FormatGuvZeile => {
    const z = roh.get(f)!, anteil = umsatz > 0 ? z.umsatz / umsatz : 0;
    const umlage = i === FORMAT_SCHLUESSEL.length - 1 ? zentrale - verteilt : eur(zentrale * anteil);
    verteilt += umlage;
    return { format: f, name: FORMAT_NAME[f], haeuser: z.n, regionen: formatRegionen(f).length, cluster: cluster(f),
      umsatz: eur(z.umsatz), hausEbitda: eur(z.ebitda), umlageZentrale: umlage, ergebnis: eur(z.ebitda - umlage), anteilUmsatz: anteil,
      umsatzWoche: eur(z.uw), hausEbitdaWoche: eur(z.ew) };
  });
  const hausEbitda = zeilen.reduce((n, z) => n + z.hausEbitda, 0);
  return { wochen, vorlaufWochen, umsatz: eur(umsatz), hausEbitda, zentrale, ergebnis: hausEbitda - zentrale, umlage: 'umsatz', zeilen };
}

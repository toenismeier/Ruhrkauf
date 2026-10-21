/** Q16: rein lesende Stadtkennzahlen. Budgets und Nachfrage laufen ausschließlich über marketing.ts. */
import type { GameState, Haus, Region } from './types';
import { clamp } from './util';
import { kanaele, kanalWirkung, type KanalId } from './marketing';
import { wettbewerbUebersicht } from './wettbewerb';

export interface MarketingStadt {
  stadt: string;
  region: Region;
  markenbekanntheit: number;
  marketingdruck: number;
  praesenz: number;
  marktanteile: { hartwig: number; volkskauf: number; fundus: number; wettbewerber: number };
  /** Summe der vier auf 100 % normierten, ausdrücklich geschätzten Marktpositionen. */
  wettbewerberAnzahl: number;
  haeuserAktiv: number;
}
export interface MarketingStadtDaten {
  staedte: MarketingStadt[];
  kanaele: ReturnType<typeof kanaele>;
  kapazitaet: { verfuegbar: number; zugeordnet: number; teams: Partial<Record<KanalId, number>> };
}

const aktiv = (h: Haus): boolean => !['geschlossen', 'verkauft'].includes(h.status);
/** Vergleichsgröße statt vorgetäuschter Kassendaten für reine Datenhäuser. */
function volumen(h: Haus): number {
  const ist = h.kpi?.umsatz ?? 0;
  if (ist > 0) return ist;
  const proQm = h.format === 'warenhaus' ? 65 : h.format === 'sport' ? 52 : h.format === 'schwester' ? 42 : 39;
  return Math.max(1, h.grundflaecheQm * proQm);
}

/** Stadtbezogene Betrachtung ohne neue ökonomische Simulation oder Zufallsziehung. */
export function marketingStaedte(s: GameState): MarketingStadtDaten {
  const ortsgruppen = new Map<string, Haus[]>();
  for (const h of s.haeuser) {
    const gruppe = ortsgruppen.get(h.stadt) ?? [];
    gruppe.push(h);
    ortsgruppen.set(h.stadt, gruppe);
  }
  const result: MarketingStadt[] = [];
  const m = s.marketing.stand;
  for (const [stadt, alle] of ortsgruppen) {
    const offen = alle.filter(aktiv);
    const anteile = { hartwig: 0, volkskauf: 0, fundus: 0, wettbewerber: 0 };
    for (const h of offen) {
      const gruppe = h.format === 'schwester' ? 'volkskauf' : h.format === 'outlet' ? 'fundus' : 'hartwig';
      anteile[gruppe] += volumen(h);
    }
    // Ausschließlich persistente Akteure der Wettbewerber-Engine; kein erfundener Konkurrent.
    const konkurrenten = wettbewerbUebersicht(s, stadt).filter((w) => w.status !== 'geschlossen' && w.art !== 'leer_ehemals');
    const mittel = alle.reduce((sum, h) => sum + h.wettbewerbStart, 0) / Math.max(1, alle.length);
    // Historischer Wettbewerbsdruck bildet auch nicht einzeln modellierte Geschäfte ab.
    const sonstigerMarkt = (anteile.hartwig + anteile.volkskauf + anteile.fundus) * clamp(mittel * 0.7, 0.2, 0.8);
    anteile.wettbewerber = sonstigerMarkt + konkurrenten.reduce((sum, w) => {
      const roh = s.wettbewerber.find((x) => x.id === w.id);
      return sum + (roh?.grundflaecheQm ?? 0) * 55 * clamp(w.staerke, 0, 3);
    }, 0);
    const gesamt = Object.values(anteile).reduce((sum, x) => sum + x, 0);
    const quote = Object.fromEntries(Object.entries(anteile).map(([k, v]) => [k, gesamt > 0 ? v / gesamt : 0])) as MarketingStadt['marktanteile'];
    const druck = offen.length && m ? offen.reduce((sum, h) => {
      const plan = kanalWirkung(s, m.plan, h);
      return sum + (plan > 0 ? kanalWirkung(s, m.ist, h) / plan : 1);
    }, 0) / offen.length : 1;
    const praesenz = offen.length / Math.max(1, alle.length);
    result.push({
      stadt, region: alle[0].region,
      markenbekanntheit: Math.round(clamp(s.stakeholder.image * clamp(druck, 0.7, 1.3) * praesenz, 0, 100)),
      marketingdruck: druck, praesenz,
      marktanteile: quote, wettbewerberAnzahl: konkurrenten.length, haeuserAktiv: offen.length,
    });
  }
  const verfuegbar = Math.max(0, Math.floor(s.hq.abteilungen.find((x) => x.id === 'marketing')?.fte ?? 0));
  const teams = { ...(m?.kanalTeams ?? {}) };
  return {
    staedte: result.sort((a, b) => a.stadt.localeCompare(b.stadt, 'de')),
    kanaele: kanaele(s),
    kapazitaet: { verfuegbar, zugeordnet: Object.values(teams).reduce((sum, n) => sum + (n ?? 0), 0), teams },
  };
}

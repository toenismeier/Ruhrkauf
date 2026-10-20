import { readFileSync } from 'fs';
import { join } from 'path';
import { neueWelt, UMSATZZIELE_JAHR1, STANDARD_SZENARIO } from '../src/welt';
import { TIEF_SCHLIESSUNGSQUOTE } from '../scripts/bot';
import type { Haus, GruppeId } from '../src/types';

/** Dieselbe jährliche Nachfragebasis, die in der Startwelt angelegt wird.
 * Das ist noch nicht der IST-Umsatz nach 52 gespielten Wochen.
 */
function umsatzbasis(h: Haus): number {
  return (Object.entries(h.potenzial) as [GruppeId, number][]).reduce((sum, [g, p]) => {
    const qm = h.flaechen.filter((f) => f.gruppe === g).reduce((a, f) => a + f.qm, 0);
    return sum + p * (1 - Math.exp(-qm / (h.saettigungQm[g] ?? 1)));
  }, 0) * 52;
}

describe('Maßstab Phase 2: Nachfrageanker und Liquiditätsbasis', () => {
  test.each([1, 2, 3])('Seed %i trifft die jährliche Basis je Format und Hausklasse', (seed) => {
    const s = neueWelt(seed);
    const summen = { A: 0, B: 0, C: 0, premium: 0, sport: 0 };
    for (const h of s.haeuser) {
      if (h.nurDaten) continue;
      const k = h.format === 'sport' ? 'sport' : h.klasse === 'premium' ? 'premium' : h.hausklasse;
      if (!k) throw new Error(`Haus ${h.id} ohne Klasse`);
      summen[k] += umsatzbasis(h);
    }
    for (const k of Object.keys(summen) as (keyof typeof summen)[]) {
      const abweichung = Math.abs(summen[k] / UMSATZZIELE_JAHR1[k] - 1);
      expect(abweichung).toBeLessThan(0.0001);
    }
    expect(s.haeuser.filter((h) => !h.nurDaten)).toHaveLength(408);
    expect(s.haeuser.filter((h) => h.nurDaten)).toHaveLength(152);
  });

  test('Startfinanzierung wächst mit dem Konzernmaßstab', () => {
    const s = neueWelt(1);
    expect(STANDARD_SZENARIO.startCash).toBe(400_000_000);
    expect(STANDARD_SZENARIO.kreditlinie).toBe(300_000_000);
    expect(s.cash).toBe(400_000_000);
    expect(s.kreditlinie).toBe(300_000_000);
    expect(s.kvLimitBasis).toBe(1_260_000_000);
  });

  test('FUNDUS-JSON entspricht dem Engine-Export für Seed 1', () => {
    const s = neueWelt(1);
    const exportiert = JSON.parse(readFileSync(join(__dirname, '..', '..', 'render', 'haeuser-outlet.json'), 'utf8')) as Record<string, unknown>[];
    const ausWelt = s.haeuser.filter((h) => h.format === 'outlet').map((h) => ({
      id: h.id, name: h.name, stadt: h.stadt, format: h.format,
      nurDaten: true, lage: h.lage, cluster: h.cluster, region: h.region,
      grundflaecheQm: h.grundflaecheQm, etagen: h.etagen, baujahr: h.baujahr,
      fassade: h.fassade, substanz: h.substanz, status: h.status,
      flaechen: h.flaechen.map((f) => ({ id: f.id, etage: f.etage, qm: f.qm, konzept: f.konzept })),
    }));
    expect(exportiert).toHaveLength(66);
    expect(exportiert).toEqual(ausWelt);
  });

  test('Bot C schließt proportional und berücksichtigt keine Datenhäuser', () => {
    expect(TIEF_SCHLIESSUNGSQUOTE).toBeCloseTo(50 / 180, 10);
    expect(Math.round(408 * TIEF_SCHLIESSUNGSQUOTE)).toBe(113);
  });
});

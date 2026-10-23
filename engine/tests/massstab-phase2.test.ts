import { readFileSync } from 'fs';
import { join } from 'path';
import { neueWelt, UMSATZZIELE_JAHR1, STANDARD_SZENARIO } from '../src/welt';
import { gruppenFuer } from '../src/daten';
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
      // Volkskauf und FUNDUS haben eigene Wirtschaft (engine-formate.md), nicht die Hartwig-Klassenanker.
      if (h.nurDaten || h.format === 'schwester' || h.format === 'outlet') continue;
      const k = h.format === 'sport' ? 'sport' : h.klasse === 'premium' ? 'premium' : h.hausklasse;
      if (!k) throw new Error(`Haus ${h.id} ohne Klasse`);
      summen[k] += umsatzbasis(h);
    }
    for (const k of Object.keys(summen) as (keyof typeof summen)[]) {
      const abweichung = Math.abs(summen[k] / UMSATZZIELE_JAHR1[k] - 1);
      expect(abweichung).toBeLessThan(0.0001);
    }
    expect(s.haeuser.filter((h) => !h.nurDaten)).toHaveLength(561);
    expect(s.haeuser.filter((h) => h.nurDaten)).toHaveLength(0);
  });

  test('Startfinanzierung wächst mit dem Konzernmaßstab', () => {
    const s = neueWelt(1);
    expect(STANDARD_SZENARIO.startCash).toBe(400_000_000);
    expect(STANDARD_SZENARIO.kreditlinie).toBe(300_000_000);
    expect(s.cash).toBe(400_000_000);
    expect(s.kreditlinie).toBe(300_000_000);
    expect(s.kvLimitBasis).toBe(1_260_000_000);
    const basisJahr = Object.values(s.basisUmsatz).reduce((sum, u) => sum + (u ?? 0), 0) * 52;
    // Q35: Startgrenze = 50.000 € × Volumenfaktor × 6, auf 50.000 € gerundet (rund 1 Mio. € EK).
    const grenzeSoll = Math.round(50_000 * Math.max(1, basisJahr / 3_100_000_000) * 6 / 50_000) * 50_000;
    expect(s.einkauf.grenze).toBe(grenzeSoll);
  });

  test('Volkskauf und FUNDUS besitzen Warengruppen und sind wirtschaftlich aktiv', () => {
    const s = neueWelt(1);
    const schwester = s.haeuser.filter((h) => h.format === 'schwester');
    const fundus = s.haeuser.filter((h) => h.format === 'outlet');
    expect(schwester).toHaveLength(86);
    expect(fundus).toHaveLength(66);
    // Volkskauf: Warenhaussortiment ohne Food, Untergeschoss nur Lager (engine-formate.md 2).
    expect(gruppenFuer('schwester')).toEqual(gruppenFuer('warenhaus').filter((g) => g !== 'food'));
    expect(gruppenFuer('outlet')).toEqual(['damen', 'herren', 'kinder', 'schuhe', 'accessoires', 'wohnen', 'beauty']);
    for (const h of [...schwester, ...fundus]) {
      expect(h.nurDaten).toBe(false);
      expect(h.miete.mieteWoche).toBeGreaterThan(0);
      expect(h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen).toBeGreaterThan(0);
      expect(h.flaechen.length).toBeGreaterThan(1);
      for (const g of gruppenFuer(h.format)) {
        expect(h.flaechen.some((f) => f.gruppe === g && f.qm > 0)).toBe(true);
        expect(h.potenzial[g]).toBeGreaterThan(0);
      }
    }
    for (const h of fundus) for (const f of h.flaechen) expect(f.konzept).toBe('offprice');
    expect(s.basisUmsatz.schuhe).toBeUndefined();
  });

  test('FUNDUS-JSON entspricht dem Engine-Export für Seed 1', () => {
    const s = neueWelt(1);
    const exportiert = JSON.parse(readFileSync(join(__dirname, '..', '..', 'render', 'haeuser-outlet.json'), 'utf8')) as Record<string, unknown>[];
    const ausWelt = s.haeuser.filter((h) => h.format === 'outlet').map((h) => ({
      id: h.id, name: h.name, stadt: h.stadt, format: h.format,
      nurDaten: true, lage: h.lage, cluster: h.cluster, region: h.region,
      grundflaecheQm: h.grundflaecheQm, etagen: h.etagen, baujahr: h.baujahr,
      fassade: h.fassade, substanz: h.substanz, status: h.status,
      flaechen: h.flaechen.map((f) => ({ id: f.id, etage: f.etage, qm: f.qm, konzept: f.konzept, ...(f.gruppe ? { gruppe: f.gruppe } : {}) })),
    }));
    expect(exportiert).toHaveLength(66);
    // #31: fassaden-verteilen.js verschiebt nur die Grafikfelder Fassade (50-km-Kopienregel) und kappt die
    // Grafik-Grundfläche (FUNDUS b-Lage höchstens 80 % von Hartwig); alles Übrige ist der unveränderte Engine-Export.
    const ohneGrafik = (h: Record<string, unknown>) => { const { fassade, grundflaecheQm, ...rest } = h; return rest; };
    expect(exportiert.map(ohneGrafik)).toEqual(ausWelt.map(ohneGrafik));
    for (const [i, h] of exportiert.entries()) {
      expect(h.fassade as number).toBeGreaterThanOrEqual(0);
      expect(h.fassade as number).toBeLessThan(8);
      expect(h.grundflaecheQm as number).toBeLessThanOrEqual(ausWelt[i].grundflaecheQm);
    }
    for (const h of exportiert) {
      const f = h.flaechen as { gruppe?: string; konzept: string }[];
      expect(f.map((x) => x.gruppe)).toEqual(['damen', 'herren', 'kinder', 'schuhe', 'accessoires', 'wohnen', 'beauty']);
      expect(f.every((x) => x.konzept === 'offprice')).toBe(true);
      expect((h.name as string).startsWith('FUNDUS ' + h.stadt)).toBe(true);
      expect(h.lage === 'rand' ? (h.baujahr as number) >= 1998 : (h.baujahr as number) >= 1965).toBe(true);
    }
  });

  test('Bot C schließt proportional und berücksichtigt keine Datenhäuser', () => {
    expect(TIEF_SCHLIESSUNGSQUOTE).toBeCloseTo(50 / 180, 10);
    expect(Math.round(409 * TIEF_SCHLIESSUNGSQUOTE)).toBe(114);
  });
});

// O02 Umsatztreiber: mathematische und fachliche Abnahmekriterien.
import { neuesSpiel, wocheAbspielen, setzeTreiber, treiberFaktor, hausTreiber, umsatzbruecke, ranking, reporting } from '../src';
import type { GameState } from '../src';

function simuliere(s: GameState, wochen: number): void {
  s.cash = 1_000_000_000_000; // Liquiditätsengpässe sollen den Test nicht abbrechen.
  for (let i = 0; i < wochen && s.phase !== 'zerschlagen'; i++) wocheAbspielen(s);
}
describe('O02 Umsatztreiber', () => {
  test.each([1, 2, 3])('Startwerte neutral, Seed %i', (seed) => {
    const neu = neuesSpiel(seed), alt = neuesSpiel(seed);
    for (const h of neu.haeuser) {
      expect(h.treiber).toEqual({ frequenz: 1, kaufquote: 1, bon: 1 });
      setzeTreiber(neu, h.id, 'test', 'frequenz', 1);
    }
    simuliere(neu, 2);
    simuliere(alt, 2);
    expect(neu.historie).toEqual(alt.historie);
    for (let i = 0; i < neu.haeuser.length; i++) {
      expect(neu.haeuser[i].kpi).toEqual(alt.haeuser[i].kpi);
      expect(neu.haeuser[i].treiber).toEqual({ frequenz: 1, kaufquote: 1, bon: 1 });
    }
  });

  test('Quellen multiplizieren sich; Entfernen ist unabhängig und validiert', () => {
    const s = neuesSpiel(1), id = s.haeuser[0].id;
    setzeTreiber(s, id, 'personal', 'kaufquote', 0.97);
    setzeTreiber(s, id, 'ware', 'kaufquote', 0.94);
    setzeTreiber(s, id, 'marketing', 'frequenz', 1.08);
    expect(treiberFaktor(s.haeuser[0]).kaufquote).toBeCloseTo(0.97 * 0.94, 12);
    expect(treiberFaktor(s.haeuser[0]).frequenz).toBe(1.08);
    setzeTreiber(s, id, 'personal', 'kaufquote', 1);
    expect(treiberFaktor(s.haeuser[0]).kaufquote).toBe(0.94);
    expect(() => setzeTreiber(s, id, '', 'bon', 1)).toThrow();
    expect(() => setzeTreiber(s, id, 'preis', 'bon', NaN)).toThrow();
    expect(() => setzeTreiber(s, 'unbekannt', 'personal', 'bon', 0.9)).toThrow();
  });

  test('Veränderte Faktoren haben eine messbare Umsatzwirkung', () => {
    const a = neuesSpiel(2), b = neuesSpiel(2);
    const id = a.haeuser[0].id;
    setzeTreiber(b, id, 'service', 'kaufquote', 0.8);
    simuliere(a, 1); simuliere(b, 1);
    const aU = a.haeuser[0].kpi?.umsatz ?? 0, bU = b.haeuser[0].kpi?.umsatz ?? 0;
    expect(bU).toBeLessThan(aU);
  });

  test('Jede Hauszerlegung reproduziert den gebuchten Umsatz centfrei in Euro', () => {
    const s = neuesSpiel(3);
    simuliere(s, 4);
    for (const h of s.haeuser) {
      const d = hausTreiber(s, h.id);
      expect(d).toBeDefined();
      expect(d!.aktuell.umsatz).toBe(h.kpi?.woche === 3 ? h.kpi.umsatz : 0);
      expect(d!.aktuell.frequenz * d!.aktuell.kaufquote * d!.aktuell.bon).toBeCloseTo(d!.aktuell.umsatz, 6);
      expect(d!.aktuell.frequenz * d!.aktuell.kaufquote * d!.aktuell.teile * d!.aktuell.preis).toBeCloseTo(d!.aktuell.umsatz, 6);
      expect(d!.aktuell.kaufquote).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(d!.aktuell.bon)).toBe(true);
    }
  });

  test('Vorjahresbrücke und Teil- sowie Preiseffekt addieren sich exakt', () => {
    const s = neuesSpiel(5);
    simuliere(s, 58);
    for (const wochen of [1, 4]) {
      for (const o of [
        { ebene: 'konzern' as const },
        { ebene: 'region' as const, id: 'West' },
        { ebene: 'haus' as const, id: s.haeuser[0].id },
      ]) {
        const b = umsatzbruecke(s, { ...o, vergleich: 'vorjahr', wochen });
        expect(b.status).toBe('ok');
        expect(b.frequenz + b.kaufquote + b.teile + b.preis).toBe(b.differenz);
        expect(b.bon).toBe(b.teile + b.preis);
        expect(b.aktuell - b.vorher).toBe(b.differenz);
      }
    }
    const plan = umsatzbruecke(s, { ebene: 'konzern', vergleich: 'plan', wochen: 4 });
    expect(plan.status).toBe('kein Plan vorhanden');
    const rp = reporting(s, 4);
    expect(rp.bruecke.differenz).toBe(rp.bruecke.frequenz + rp.bruecke.kaufquote + rp.bruecke.bon);
    expect(rp.beobachtung.length).toBeLessThanOrEqual(10);
    expect(rp.beobachtung.every((z) => z.abweichung < 0)).toBe(true);
    const west = rp.gruppen.find((z) => z.ebene === 'region' && z.id === 'West');
    expect(west?.umsatz).toBe(rp.zeilen.filter((z) => z.region === 'West').reduce((sum, z) => sum + z.umsatz, 0));
  });

  test('Verlauf wird für 104 Wochen rollierend gespeichert und verdichtet', () => {
    const s = neuesSpiel(11);
    simuliere(s, 114);
    const h = s.haeuser[0], verlauf = h.treiberVerlauf!;
    expect(verlauf.length).toBeLessThanOrEqual(66);
    expect(verlauf.filter((v) => v.von === v.bis).length).toBeGreaterThanOrEqual(52);
    expect(verlauf.some((v) => v.bis > v.von)).toBe(true);
    expect(Math.min(...verlauf.map((v) => v.von))).toBeGreaterThanOrEqual(s.woche - 107);
    expect(hausTreiber(s, h.id, 4)?.vorjahr).toBeDefined();
    const rr = ranking(s, { kennzahl: 'umsatz', ebene: 'alle' });
    expect(rr).toHaveLength(s.haeuser.filter((x) => x.status !== 'verkauft' && x.kpi?.woche === s.woche - 1).length);
    expect(rr[0].rangGesamt).toBe(1);
  });
});

import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { kapitalfluss } from '../src/abfragen';
import { botTief } from '../scripts/bot';

jest.setTimeout(180_000);

describe('Kapitalfluss im Wochenabschluss', () => {
  test.each([1, 2, 3])('Seed %i: 104 Wochen exakt auf Cash abgestimmt', (seed) => {
    const s = neuesSpiel(seed);
    for (let i = 0; i < 104; i++) {
      botTief(s);
      const vor = s.historie[s.historie.length - 1]?.cash ?? s.cash;
      const k = wocheAbspielen(s);
      const f = kapitalfluss(s);
      expect(f.woche).toBe(i);
      expect(f.bestand).toBe(s.cash);
      expect(f.bestand).toBe(k.cash);
      expect(f.netto).toBe(s.cash - vor);
      expect(f.operativ + f.investitionen + f.finanzierung + f.sonstiges).toBe(f.netto);
      for (const n of [f.operativ, f.investitionen, f.finanzierung, f.sonstiges, f.netto, f.bestand]) {
        expect(Number.isSafeInteger(n)).toBe(true);
      }
    }
  });

  test('Investition vor der ersten Spielwoche ist in der Cash-Brücke enthalten', () => {
    const s = neuesSpiel(1);
    const start = s.cash;
    s.cash -= 750_000;
    s.kapitalflussOffen = { investitionen: -750_000, finanzierung: 0 };
    wocheAbspielen(s);
    const f = kapitalfluss(s);
    expect(f.netto).toBe(s.cash - start);
    expect(f.investitionen).toBe(-750_000);
    expect(f.operativ + f.investitionen + f.finanzierung + f.sonstiges).toBe(f.netto);
  });

  test('alte Spielstände ohne Kapitalfluss bleiben lesbar, ohne fiktive Kategorien', () => {
    const s = neuesSpiel(1);
    s.historie.push({ woche: 0, cash: 3_000_000 } as typeof s.historie[number]);
    s.historie.push({ woche: 1, cash: 2_100_000 } as typeof s.historie[number]);
    const f = kapitalfluss(s);
    expect(f.netto).toBe(-900_000);
    expect(f.operativ).toBe(0);
    expect(f.sonstiges).toBe(-900_000);
  });
});

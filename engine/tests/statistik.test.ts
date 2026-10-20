import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { verlauf } from '../src/abfragen';
import { botTief } from '../scripts/bot';

describe('N01 Statistik ohne Wirtschaftseffekt', () => {
  test('Seed 1 mit und ohne Erfassung liefert identische Ergebnisse', () => {
    const mit = neuesSpiel(1), ohne = neuesSpiel(1);
    ohne.statistikDeaktiviert = true;
    for (let w = 0; w < 104; w++) {
      botTief(mit); botTief(ohne);
      const a = wocheAbspielen(mit), b = wocheAbspielen(ohne);
      expect(a).toEqual(b);
      expect(mit.cash).toBe(ohne.cash);
      expect(mit.rng).toBe(ohne.rng);
      expect(mit.phase).toBe(ohne.phase);
    }
    expect(ohne.haeuser.every(h => !h.verlauf)).toBe(true);
    const h = mit.haeuser.find(h => h.status === 'offen' && h.kpi && h.verlauf?.length)!;
    expect(h).toBeDefined();
    expect(h.verlauf!.length).toBeLessThanOrEqual(156);
    expect(h.verlauf!.length).toBeGreaterThanOrEqual(52);
    if (mit.statistik?.sparsam) {
      // Im Speicher-Sparmodus wird nach Woche 52 nur alle 4 Wochen verankert.
      expect(h.verlauf!.filter(p => p.woche > 52 && p.woche < 103)
        .every(p => p.woche % 4 === 0)).toBe(true);
    }
    expect(verlauf(mit, {ebene:'konzern', kennzahl:'umsatz', wochen:'alle'}).punkte.at(-1)?.vorjahr)
      .toBe(mit.historie[mit.historie.length-53]?.umsatz);
    expect(verlauf(mit, {ebene:'konzern', kennzahl:'ebitda', wochen:13}).punkte.at(-1)?.plan)
      .toBeDefined();
    expect(h.verlauf?.at(-1)?.umsatz).toBe(h.kpi?.umsatz);
    expect(verlauf(mit, { ebene: 'konzern', kennzahl: 'umsatz', wochen: 13 }).punkte.at(-1)?.wert)
      .toBe(mit.historie.at(-1)?.umsatz);
    expect(verlauf(mit, { ebene: 'haus', id: h.id, kennzahl: 'db', wochen: 52 }).punkte.at(-1)?.wert)
      .toBe(h.kpi?.db);
  }, 120_000);
  test('Nicht vorhandene Formate geben keine erfundenen Daten zurück', () => {
    const s = neuesSpiel(1);
    expect(verlauf(s, { ebene: 'format', id: 'FUNDUS', kennzahl: 'umsatz', wochen: 52 }).punkte).toEqual([]);
  });
});

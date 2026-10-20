import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { verlauf } from '../src/abfragen';

describe('N01 Statistik ohne Wirtschaftseffekt', () => {
  test('Seed 1 mit und ohne Erfassung liefert identische Ergebnisse', () => {
    const mit = neuesSpiel(1), ohne = neuesSpiel(1);
    ohne.statistikDeaktiviert = true;
    for (let w = 0; w < 14; w++) {
      const a = wocheAbspielen(mit), b = wocheAbspielen(ohne);
      expect(a).toEqual(b);
      expect(mit.cash).toBe(ohne.cash);
      expect(mit.rng).toBe(ohne.rng);
      expect(mit.phase).toBe(ohne.phase);
    }
    expect(ohne.haeuser.every(h => !h.verlauf)).toBe(true);
    const h = mit.haeuser[0];
    expect(h.verlauf).toHaveLength(14);
    expect(h.verlauf?.at(-1)?.umsatz).toBe(h.kpi?.umsatz);
    expect(verlauf(mit, { ebene: 'konzern', kennzahl: 'umsatz', wochen: 13 }).punkte.at(-1)?.wert)
      .toBe(mit.historie.at(-1)?.umsatz);
    expect(verlauf(mit, { ebene: 'haus', id: h.id, kennzahl: 'db', wochen: 52 }).punkte.at(-1)?.wert)
      .toBe(h.kpi?.db);
  });
  test('Nicht vorhandene Formate geben keine erfundenen Daten zurück', () => {
    const s = neuesSpiel(1);
    expect(verlauf(s, { ebene: 'format', id: 'FUNDUS', kennzahl: 'umsatz', wochen: 52 }).punkte).toEqual([]);
  });
});

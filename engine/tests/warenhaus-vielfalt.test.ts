import { STAEDTE } from '../src/daten';
import { neuesSpiel } from '../src';

describe('Q21: Warenhauslagen pro Stadt', () => {
  const spiel = neuesSpiel(1);
  const metropolen = new Set(STAEDTE.filter((st) => st[2] === 'metropole').map((st) => st[0]));
  const warenhaeuser = spiel.haeuser.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium');

  test('nur echte Metropol-Center, maximal eines je Stadt', () => {
    const center = warenhaeuser.filter((h) => h.lage === 'center');
    expect(center.length).toBeGreaterThan(0);
    expect(center.length).toBeLessThanOrEqual(metropolen.size);
    for (const h of center) {
      expect(metropolen.has(h.stadt)).toBe(true);
      expect(warenhaeuser.filter((q) => q.stadt === h.stadt && q.lage === 'center')).toHaveLength(1);
    }
  });

  test('Städte mit mindestens drei Warenhäusern haben ein Stadtteilzentrum', () => {
    for (const stadt of new Set(warenhaeuser.map((h) => h.stadt))) {
      const regulaer = warenhaeuser.filter((h) => h.stadt === stadt);
      if (regulaer.length >= 3) expect(regulaer.some((h) => h.lage === 'stadtteil')).toBe(true);
      expect(regulaer.filter((h) => h.lage === 'center')).toHaveLength(regulaer.length >= 5 && metropolen.has(stadt) ? 1 : 0);
    }
  });

  test('Premiumhäuser behalten ihre 1a-Lage, normale Städte ihren Innenstadtanker', () => {
    for (const stadt of new Set(spiel.haeuser.filter((h) => h.format === 'warenhaus').map((h) => h.stadt))) {
      const alle = spiel.haeuser.filter((h) => h.format === 'warenhaus' && h.stadt === stadt);
      // Q08: Berlin besitzt zwei selbständige Premium-1a-Lagen.
      expect(alle.filter((h) => h.lage === '1a')).toHaveLength(Math.max(1, alle.filter((h) => h.klasse === 'premium').length));
      expect(alle.filter((h) => h.klasse === 'premium').every((h) => h.lage === '1a')).toBe(true);
    }
  });
});

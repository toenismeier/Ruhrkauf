import { fuehreAus, kanaele, marketingStaedte, neuesSpiel, wocheAbspielen } from '../src';

describe('Q16 Marketing in Städten', () => {
  test('Marktanteile vollständig und die Ausgangslage für Markenbekanntheit neutral', () => {
    const s = neuesSpiel(1);
    const vorher = JSON.stringify(s);
    const d = marketingStaedte(s);
    expect(JSON.stringify(s)).toBe(vorher); // reine Abfrage, keine zweite Simulation
    expect(d.staedte.length).toBeGreaterThan(0);
    for (const stadt of d.staedte) {
      expect(Object.values(stadt.marktanteile).reduce((sum, x) => sum + x, 0)).toBeCloseTo(1, 10);
      expect(stadt.markenbekanntheit).toBeGreaterThanOrEqual(0);
      expect(stadt.markenbekanntheit).toBeLessThanOrEqual(100);
      if (stadt.praesenz === 1) expect(stadt.markenbekanntheit).toBe(Math.round(s.stakeholder.image));
    }
  });

  test('Budgetslider setzt exakt die vorhandene Kanalaktion und wirkt auf den Standardplan', () => {
    const s = neuesSpiel(2);
    const ziel = kanaele(s).kanaele.find((k) => k.id === 'prospekt')!;
    expect(fuehreAus(s, { typ: 'kanalBudget', kanal: 'prospekt', euroWoche: ziel.budgetWoche * 1.2 }).ok).toBe(true);
    expect(kanaele(s).kanaele.find((k) => k.id === 'prospekt')!.budgetWoche).toBeCloseTo(Math.round(ziel.budgetWoche * 1.2), -2);
    expect(s.marketing.stand.plan.kanaele.prospekt.quote).not.toBe(s.marketing.stand.ist.kanaele.prospekt.quote);
    wocheAbspielen(s);
    expect(marketingStaedte(s).staedte.some((x) => x.marketingdruck !== 1)).toBe(true);
  });

  test('Regionale Ausspielung der Engine und Teamzuordnung ohne zweite Kostenfunktion', () => {
    const s = neuesSpiel(3);
    const vorher = kanaele(s).kanaele.find((x) => x.id === 'plakat')!.budgetWoche;
    expect(fuehreAus(s, { typ: 'kanalBudget', kanal: 'plakat', regionen: { West: 1.5 } }).ok).toBe(true);
    expect(kanaele(s).kanaele.find((x) => x.id === 'plakat')!.regionen.West).toBe(1.5);
    expect(kanaele(s).kanaele.find((x) => x.id === 'plakat')!.budgetWoche).toBe(vorher);
    const alt = s.marketing.stand.ist.kanaele.plakat.quote;
    expect(fuehreAus(s, { typ: 'kanalTeam', kanal: 'plakat', delta: 1 }).ok).toBe(true);
    expect(marketingStaedte(s).kapazitaet.teams.plakat).toBe(1);
    expect(s.marketing.stand.ist.kanaele.plakat.quote).toBe(alt);
    expect(fuehreAus(s, { typ: 'kanalTeam', kanal: 'plakat', delta: -1 }).ok).toBe(true);
  });
});

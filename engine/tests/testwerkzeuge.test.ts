import { fuehreAus, neuesSpiel, TEST_EREIGNISSE, wocheAbspielen } from '../src';

describe('N14 Testwerkzeuge', () => {
  test('ohne Testaktionen bleibt der Spielstand unverändert markiert', () => {
    const s = neuesSpiel(1);
    expect(s.testGenutzt).toBeUndefined();
    wocheAbspielen(s);
    expect(s.testGenutzt).toBeUndefined();
  });

  test('Test-Cash und Stakeholder sind valide und markieren den Stand', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'testCash', betrag: 12_345_678 }).ok).toBe(true);
    expect(s.cash).toBe(12_345_678);
    expect(fuehreAus(s, { typ: 'testStakeholder', feld: 'bank', wert: 120 }).ok).toBe(true);
    expect(s.stakeholder.bank).toBe(100);
    expect(s.testGenutzt).toBe(true);
  });

  test('ungültige Testaktion hat keinerlei Auswirkung', () => {
    const s = neuesSpiel(1);
    const vorher = JSON.stringify(s);
    expect(fuehreAus(s, { typ: 'testCash', betrag: Number.NaN }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'testEreignis', ereignis: 'angebot:unbekannt' as never }).ok).toBe(false);
    expect(JSON.stringify(s)).toBe(vorher);
  });

  test('Testwochen entsprechen derselben Engine-Simulation ohne Bot', () => {
    const s = neuesSpiel(2), kontrolle = neuesSpiel(2);
    for (let i = 0; i < 13; i++) {
      expect(fuehreAus(s, { typ: 'testWoche' }).ok).toBe(true);
      wocheAbspielen(kontrolle);
    }
    expect(s.woche).toBe(13);
    expect(s.testGenutzt).toBe(true);
    const { testGenutzt: _test, ...vergleich } = s;
    expect(vergleich).toEqual(kontrolle);
  });

  test('Ereigniskatalog hat eindeutige Aktionen, ungültige Schwierigkeit wird abgelehnt', () => {
    const s = neuesSpiel(3);
    expect(new Set(TEST_EREIGNISSE.map((e) => e.id)).size).toBe(TEST_EREIGNISSE.length);
    expect(TEST_EREIGNISSE.length).toBeGreaterThanOrEqual(20);
    expect(fuehreAus(s, { typ: 'testSchwierigkeit', stufe: 'mittel' }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'testSchwierigkeit', stufe: 'unbekannt' as never }).ok).toBe(false);
    expect(s.schwierigkeit).toBe('mittel');
  });

  test('Insolvenz wird durch eigene Testaktion eröffnet', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'testInsolvenz' }).ok).toBe(true);
    expect(s.phase).toBe('insolvenz');
    expect(s.insolvenz).toBeDefined();
    expect(s.testGenutzt).toBe(true);
  });
});

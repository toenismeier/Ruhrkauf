import { neuesSpiel, organisationUebersicht, PREMIUM_HAEUSER, STAEDTE, STADT_REGIONEN, stadtRegion } from '../src';

describe('Q04 TestFlight-Wurf 1: Spielbefunde', () => {
  test('Alle Spielstädte haben eine eindeutige, deterministische geografische Region', () => {
    expect(Object.keys(STADT_REGIONEN)).toHaveLength(STAEDTE.length);
    expect(new Set(STAEDTE.map(([name]) => name)).size).toBe(STAEDTE.length);
    for (const [name, region] of STAEDTE) {
      expect(stadtRegion(name)).toBe(region);
      expect(['Nord', 'Ost', 'West', 'Mitte', 'Süd']).toContain(region);
    }
    expect(stadtRegion('Chemnitz')).toBe('Ost');
    expect(stadtRegion('Hannover')).toBe('Nord');
    expect(stadtRegion('Essen')).toBe('West');
    expect(stadtRegion('Frankfurt (Oder)')).toBe('Ost');
    expect(stadtRegion('Nicht vorhanden')).toBeUndefined();
  });

  test.each([1, 2, 3])('Alle vier Premiumhäuser erscheinen in der Sondergruppe (Seed %i)', (seed) => {
    const s = neuesSpiel(seed);
    const premium = s.haeuser.filter((h) => h.klasse === 'premium');
    const sonder = organisationUebersicht(s).sonder;
    expect(premium).toHaveLength(4);
    expect(PREMIUM_HAEUSER).toHaveLength(4);
    expect(sonder).toBeDefined();
    expect(new Set(sonder?.hausIds)).toEqual(new Set(premium.map((h) => h.id)));
    for (const def of PREMIUM_HAEUSER) {
      expect(premium.filter((h) => h.premiumSchluessel === def.id && h.stadt === def.stadt)).toHaveLength(1);
    }
  });

  test('Vor KW 1 existiert kein abgeschlossener Clusterumsatz', () => {
    const s = neuesSpiel(1);
    expect(s.woche).toBe(0);
    expect(s.historie).toHaveLength(0);
    const u = organisationUebersicht(s);
    expect(u.regionen.flatMap((r) => r.cluster).length).toBeGreaterThan(0);
    expect(u.regionen.flatMap((r) => r.cluster).every((c) => c.umsatz === 0)).toBe(true);
    // Die Oberfläche kennzeichnet diese Werte als „noch offen“, nicht als 0 €.
  });
});

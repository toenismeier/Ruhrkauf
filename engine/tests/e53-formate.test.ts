import { neuesSpiel, wocheAbspielen, organisationUebersicht, organisationLeitungKostenWoche, migriereFormatOrganisation, konzernNachFormaten, verlauf } from '../src';
import { formatVon, formatRegionVon, FORMAT_SCHLUESSEL } from '../src/formatschluessel';
import { outletEroeffnen, outletKandidaten } from '../src/formate';

describe('E53 Etappe 1: Formattrennung Fundament', () => {
  const s = neuesSpiel(1);

  test('Jedes Format hat eine Leitung, eigene Regionen und formatreine Cluster', () => {
    const x = organisationUebersicht(s);
    expect(x.formate.map((f) => f.id)).toEqual([...FORMAT_SCHLUESSEL]);
    for (const f of x.formate) expect(f.stelle?.person).toBeDefined();
    expect(x.formate.find((f) => f.id === 'volkskauf')!.regionen.map((r) => [r.name, r.haeuser])).toEqual([['West', 30], ['Nord-Ost', 24], ['Süd-Mitte', 32]]);
    expect(x.formate.find((f) => f.id === 'sport')!.regionen.map((r) => r.haeuser)).toEqual([16, 28]);
    expect(x.formate.find((f) => f.id === 'fundus')!.regionen.map((r) => r.haeuser)).toEqual([25, 15, 26]);
    for (const c of s.organisation!.hauscluster.filter((c) => !c.sonder)) {
      const hs = c.hausIds.map((id) => s.haeuser.find((h) => h.id === id)!);
      expect(new Set(hs.map(formatVon))).toEqual(new Set([c.format]));
      expect(new Set(hs.map((h) => formatRegionVon(h)))).toEqual(new Set([c.regionSchluessel]));
    }
  });

  test('Konzern nach Formaten: Umlage verteilt genau die Zentrale', () => {
    const g = konzernNachFormaten(s);
    expect(g.zeilen.map((z) => z.haeuser)).toEqual([360, 5, 86, 44, 66]);
    expect(g.zeilen.reduce((n, z) => n + z.umlageZentrale, 0)).toBe(g.zentrale);
    expect(g.zeilen.reduce((n, z) => n + z.ergebnis, 0)).toBeCloseTo(g.ergebnis, -1);
    for (const z of g.zeilen) expect(z.umsatz).toBeGreaterThan(0);
  });

  test('Alte Spielstände: Migration bildet die Formatorganisation kostenneutral', () => {
    const alt = neuesSpiel(2);
    delete alt.organisation!.formatleitungen;
    // Wie ein alter Spielstand: Basiskosten passen zur Organisation ohne Formatleitungen.
    alt.organisation!.basisKosten += organisationLeitungKostenWoche(alt) * 52;
    const kosten = organisationLeitungKostenWoche(alt);
    expect(migriereFormatOrganisation(alt)).toBe(true);
    expect(migriereFormatOrganisation(alt)).toBe(false);
    expect(Math.abs(organisationLeitungKostenWoche(alt) - kosten)).toBeLessThanOrEqual(1);
    expect((alt.organisation as { formatleitungen?: Record<string, unknown> }).formatleitungen?.volkskauf).toBeDefined();
  });

  test('Neues FUNDUS-Haus landet in einem FUNDUS-Cluster seiner Region', () => {
    const t = neuesSpiel(3);
    t.cash = 5e9;
    const k = outletKandidaten(t)[0];
    expect(outletEroeffnen(t, k.stadt)).toBeNull();
    const neu = t.haeuser[t.haeuser.length - 1];
    const c = t.organisation!.hauscluster.find((x) => x.id === neu.hauscluster)!;
    expect(c.format).toBe('fundus');
    expect(c.regionSchluessel).toBe(formatRegionVon(neu));
  });

  test('Statistik findet Volkskauf', () => {
    const t = neuesSpiel(1);
    wocheAbspielen(t);
    const r = verlauf(t, { ebene: 'format', id: 'Volkskauf', kennzahl: 'umsatz' } as never);
    expect(r.punkte.some((p) => p.wert > 0)).toBe(true);
  });
});

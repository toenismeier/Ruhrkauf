import { neuesSpiel, SCHWIERIGKEIT, SCHWIERIGKEITEN } from '../src';
import type { SchwierigkeitId } from '../src';
import { schliesseEndgueltig } from '../src/prozesse';

describe('Schwierigkeit', () => {
  test('Auswahl für die Oberfläche, Standard mittel', () => {
    expect(SCHWIERIGKEITEN.map((x) => x.id)).toEqual(['leicht', 'mittel', 'schwer']);
    for (const x of SCHWIERIGKEITEN) { expect(x.name.length).toBeGreaterThan(2); expect(x.beschreibung.length).toBeGreaterThan(20); }
    const s = neuesSpiel(1);
    expect(s.schwierigkeit).toBe('mittel');
    expect(s.cash).toBe(120_000_000);
    expect(s.kreditlinie).toBe(90_000_000);
  });

  test('Startbedingungen: leicht mehr Kasse und geduldigere Lieferanten, schwer weniger', () => {
    const l = neuesSpiel(1, { schwierigkeit: 'leicht' });
    const m = neuesSpiel(1);
    const h = neuesSpiel(1, { schwierigkeit: 'schwer' });
    expect(l.cash).toBeGreaterThan(m.cash);
    expect(h.cash).toBeLessThan(m.cash);
    expect(l.kreditlinie).toBeGreaterThan(m.kreditlinie);
    expect(h.kreditlinie).toBeLessThan(m.kreditlinie);
    const g = (s: typeof m) => s.lieferanten.reduce((a, x) => a + x.geduld, 0);
    expect(g(l)).toBeGreaterThan(g(m));
    expect(g(h)).toBeLessThan(g(m));
    expect(SCHWIERIGKEIT.leicht.ereignisse).toBeLessThan(1);
    expect(SCHWIERIGKEIT.schwer.ereignisse).toBeGreaterThan(1);
    expect(SCHWIERIGKEIT.leicht.versammlungSchwelle).toBeLessThan(SCHWIERIGKEIT.mittel.versammlungSchwelle);
    expect(SCHWIERIGKEIT.schwer.versammlungSchwelle).toBeGreaterThan(SCHWIERIGKEIT.mittel.versammlungSchwelle);
  });

  test('Schließungswelle: Imageverlust leicht < mittel < schwer, schwer ohne Dämpfung', () => {
    const verlust = (st: SchwierigkeitId) => {
      const s = neuesSpiel(2, { schwierigkeit: st });
      const vorher = s.stakeholder.image;
      for (const h of s.haeuser.filter((x) => x.status === 'offen').slice(0, 20)) schliesseEndgueltig(s, h);
      return vorher - s.stakeholder.image;
    };
    const l = verlust('leicht'); const m = verlust('mittel'); const h = verlust('schwer');
    expect(l).toBeLessThan(m);
    expect(m).toBeLessThan(h);
    expect(h).toBeCloseTo(30, 6);
  });
});

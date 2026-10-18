import { neuesSpiel, SCHWIERIGKEIT, SCHWIERIGKEITEN, wocheAbspielen } from '../src';
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

  test('Ereignisse: gleiche Zufallsfolge auf allen Stufen, nur die Schwere skaliert', () => {
    const lauf = (st: SchwierigkeitId) => {
      const s = neuesSpiel(4, { schwierigkeit: st });
      s.cash = 5e9; s.stakeholder.betriebsrat = 10; // Streiks möglich
      for (let i = 0; i < 40; i++) wocheAbspielen(s);
      return s;
    };
    const l = lauf('leicht'); const m = lauf('mittel'); const h = lauf('schwer');
    const ereignisse = (s: ReturnType<typeof lauf>) => s.meldungen.filter((x) => /Streik|Konsumklima|Rezession|Zollstreit|Containerstau|Hallberg/.test(x.text)).map((x) => x.woche);
    expect(ereignisse(l)).toEqual(ereignisse(m));
    expect(ereignisse(h)).toEqual(ereignisse(m));
    expect(l.makro.schockStaerke).toBeLessThanOrEqual(m.makro.schockStaerke);
    expect(h.makro.schockStaerke).toBeGreaterThanOrEqual(m.makro.schockStaerke);
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

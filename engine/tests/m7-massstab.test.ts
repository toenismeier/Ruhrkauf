import { neuesSpiel, wocheAbspielen } from '../src';
import { hausFaktor } from '../src/wirtschaft';
import { PARAM } from '../src/welt';
import { saisonFaktor } from '../src/daten';
import type { SchwierigkeitId } from '../src';

describe('M7 – großer Maßstab: Ursachen und Schwierigkeit', () => {
  test('die drei Stufen verändern die operative Nachfrage ohne Änderung am Zufallsstrom', () => {
    const s = neuesSpiel(1);
    const haus = s.haeuser.find((h) => !h.nurDaten && h.status === 'offen')!;
    s.prognose = true; // keine Zufallsereignisse, identisches Haus / Nachfragepotenzial
    s.schwierigkeit = 'mittel';
    const mitte = hausFaktor(s, haus);
    s.schwierigkeit = 'leicht';
    const leicht = hausFaktor(s, haus);
    s.schwierigkeit = 'schwer';
    const schwer = hausFaktor(s, haus);
    expect(leicht / mitte).toBeCloseTo(1.035, 8);
    expect(schwer / mitte).toBeCloseTo(0.945, 8);
    expect(leicht).toBeGreaterThan(mitte);
    expect(mitte).toBeGreaterThan(schwer);
  });

  test('Woche 1: Umsatz und operative EBITDA-Quote unterscheiden sich nach Schwierigkeit', () => {
    const lauf = (stufe: SchwierigkeitId) => {
      const s = neuesSpiel(1, { schwierigkeit: stufe });
      s.prognose = true;
      const k = wocheAbspielen(s);
      return { umsatz: k.umsatz, quote: k.ebitda / k.umsatz };
    };
    const leicht = lauf('leicht');
    const mittel = lauf('mittel');
    const schwer = lauf('schwer');
    expect(leicht.umsatz).toBeGreaterThan(mittel.umsatz);
    expect(mittel.umsatz).toBeGreaterThan(schwer.umsatz);
    expect(leicht.quote).toBeGreaterThan(mittel.quote);
    expect(mittel.quote).toBeGreaterThan(schwer.quote);
  });

  test('nur die 409 wirtschaftlich aktiven Häuser tragen Q1-Kosten', () => {
    const s = neuesSpiel(1);
    expect(s.haeuser.filter((h) => !h.nurDaten)).toHaveLength(409);
    for (const h of s.haeuser.filter((x) => x.nurDaten)) {
      expect(h.miete.mieteWoche).toBe(0);
    }
    expect(PARAM.zentraleQuote).toBeLessThan(0.034);
    expect(PARAM.umsatzJeFte).toBeGreaterThan(5_750);
  });

  test('Januar bis März sind nicht mehr das schwächste künstliche Saisonquartal', () => {
    const jan = saisonFaktor('damen', 0);
    const feb = saisonFaktor('damen', 7);
    const maerz = saisonFaktor('damen', 12);
    expect(jan).toBeGreaterThan(0.95);
    expect(feb).toBeGreaterThan(0.95);
    expect(maerz).toBeGreaterThan(0.90);
    expect(saisonFaktor('spielwaren', 0)).toBeLessThan(jan);
  });
});

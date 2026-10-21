import { GRUPPEN, saisonFaktor } from '../src/daten';

describe('M7 – Saisoninterpolation ohne künstlichen Weihnachtsumsatz in KW 1', () => {
  test.each(['damen', 'herren', 'wohnen', 'beauty'] as const)(
    '%s: KW 1 beginnt mit Januarwert, KW 2 bleibt ohne Dezemberüberhang',
    (gruppe) => {
      const januar = GRUPPEN[gruppe].saison[0];
      expect(saisonFaktor(gruppe, 0)).toBeCloseTo(januar, 10);
      expect(saisonFaktor(gruppe, 1)).toBeCloseTo(januar, 10);
      expect(saisonFaktor(gruppe, 2)).toBeCloseTo(januar, 10);
      expect(saisonFaktor(gruppe, 3)).toBeLessThanOrEqual(januar);
      // Das Kalenderjahr schließt weiterhin in den Dezember-Kurve.
      expect(saisonFaktor(gruppe, 51)).toBeGreaterThan(saisonFaktor(gruppe, 0));
    },
  );

  test('Januar und Februar bei Hartwig weniger stark abgesenkt als zuvor', () => {
    const januar = saisonFaktor('damen', 0);
    const februar = saisonFaktor('damen', 7);
    expect(januar).toBeGreaterThan(0.9);
    expect(februar).toBeGreaterThan(0.9);
    // Die erhöhte Basissaison wird weiterhin auf ein Jahr normalisiert.
    expect(GRUPPEN.damen.saison.reduce((a, b) => a + b, 0) / 12).toBeCloseTo(1, 10);
  });

  test('Reproduzierbarer Jahreswechsel ohne Sonderfall nur im ersten Spieljahr', () => {
    for (const g of ['damen', 'herren', 'sport', 'spielwaren'] as const) {
      for (let w = 0; w < 52; w++) {
        expect(saisonFaktor(g, w + 52)).toBeCloseTo(saisonFaktor(g, w), 10);
        expect(Number.isFinite(saisonFaktor(g, w))).toBe(true);
      }
    }
  });
});

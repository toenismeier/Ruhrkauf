import { neuesSpiel, produkte, produktVorschau, fuehreAus, produktNachfrageFaktor, produktMargeDelta } from '../src';
import { markenLeistung, teamStaerke } from '../src/produkte';

describe('Q24: markenbezogene Produktentwicklung', () => {
  test('Leistung unterscheidet sich, ist deterministisch und bleibt im Mittel neutral', () => {
    const s = neuesSpiel(1);
    const vor = produkte(s);
    const leistungen = vor.marken.map((m) => m.leistung);
    expect(leistungen).toHaveLength(4);
    expect(new Set(leistungen.map((l) => l.wert)).size).toBeGreaterThan(1);
    const zentral = Math.round(teamStaerke(s) * 100);
    const mittel = leistungen.reduce((sum, l) => sum + l.wert, 0) / leistungen.length;
    expect(Math.abs(mittel - zentral)).toBeLessThanOrEqual(0.5);
    for (const m of vor.marken) {
      const l = markenLeistung(s, m.marke);
      expect(l).toEqual(m.leistung);
      expect(l.wert).toBeGreaterThanOrEqual(0);
      expect(l.wert).toBeLessThanOrEqual(100);
      for (const k of ['team', 'zielgruppe', 'trend', 'lieferant', 'hq', 'kategorieErfahrung'] as const) {
        expect(l[k]).toBeGreaterThanOrEqual(0);
        expect(l[k]).toBeLessThanOrEqual(100);
      }
      expect(l.teamgroesse).toBeGreaterThan(0);
    }
    expect(produkte(structuredClone(s)).marken.map((m) => m.leistung)).toEqual(leistungen);
  });

  test('Zielgruppen-Fit, Lieferant und Aktualität beeinflussen die Markenleistung', () => {
    const s = neuesSpiel(2);
    const start = markenLeistung(s, 'em1');
    s.eigenmarken.marken[0].stilAktualitaet = 100;
    s.eigenmarken.marken[0].beschaffung = 'europa';
    s.eigenmarken.marken[0].qualitaet = 5;
    const neu = markenLeistung(s, 'em1');
    expect(neu.trend).toBeGreaterThan(start.trend);
    expect(neu.lieferant).toBeGreaterThan(start.lieferant);
    expect(neu.wert).toBeGreaterThan(start.wert);
  });

  test('Bestehende Warenwerte bleiben unverändert, neue Produkte nutzen Marken-Teamwert', () => {
    const s = neuesSpiel(3);
    const p = s.produkte.liste[0];
    const bisher = p.team;
    const f = produktNachfrageFaktor(s, p.marke, p.wg), m = produktMargeDelta(s, p.marke, p.wg);
    produkte(s);
    expect(p.team).toBe(bisher);
    expect(produktNachfrageFaktor(s, p.marke, p.wg)).toBe(f);
    expect(produktMargeDelta(s, p.marke, p.wg)).toBe(m);
    const v = produktVorschau(s, {
      marke: 'em1', typ: 'Bluse', farbe: 'weiß', material: 'Baumwolle', dauer: 12, budgetWoche: 20000,
    });
    expect(v.ok).toBe(true);
    expect(v.teile?.team).toBeCloseTo(markenLeistung(s, 'em1').wert / 100, 2);
    const teamVorStart = markenLeistung(s, 'em1').wert / 100;
    const ergebnis = fuehreAus(s, { typ: 'produktEntwickeln',
      entwurf: { marke: 'em1', typ: 'Bluse', farbe: 'weiß', material: 'Baumwolle', dauer: 12, budgetWoche: 20000 } });
    expect(ergebnis.ok).toBe(true);
    const neu = s.produkte.liste[s.produkte.liste.length - 1];
    expect(neu.team).toBeCloseTo(teamVorStart, 2);
    expect(p.team).toBe(bisher);
  });
});

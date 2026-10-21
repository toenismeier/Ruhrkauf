import { neueWelt } from '../src/welt';
import { fuehreAus } from '../src/aktionen';
import { portfolio, formatCockpit, schliessungVorschau } from '../src/abfragen';

describe('Maßstab-Oberfläche: Engine als einzige Kennzahlen- und Aktionsquelle', () => {
  test('560 Häuser in 220 Städten, fünf Formate und eindeutige Steuerbarkeit', () => {
    const s = neueWelt(1);
    const hs = portfolio(s);
    expect(hs).toHaveLength(560);
    expect(new Set(hs.map((h) => h.id)).size).toBe(560);
    expect(new Set(hs.map((h) => h.stadt)).size).toBe(220);
    const formate = formatCockpit(s);
    expect(formate.map((f) => f.anzahl)).toEqual([360, 4, 44, 86, 66]);
    expect(formate.reduce((sum, f) => sum + f.anzahl, 0)).toBe(560);
    // Seit engine-formate sind auch Volkskauf und FUNDUS wirtschaftlich aktiv.
    expect(hs.filter((h) => h.steuerbar)).toHaveLength(560);
    for (const h of hs) {
      expect(h.stadt).toBeTruthy();
      expect(h.substanz).toBeGreaterThanOrEqual(0);
      expect(h.restlaufzeitMiete).toBeGreaterThanOrEqual(0);
      expect(['gruen', 'gelb', 'rot', 'ohne']).toContain(h.ampel);
      expect(Number.isFinite(h.umsatz) && Number.isFinite(h.ebitda)).toBe(true);
    }
  });

  test('Sammelpersonalabbau entspricht der bisherigen Aktion mit haeuser[]', () => {
    const s = neueWelt(1);
    const hs = portfolio(s).filter((h) => h.steuerbar).slice(0, 5);
    const ids = hs.map((h) => h.id);
    const vorher = new Map(s.haeuser.filter((h) => ids.includes(h.id)).map((h) => [h.id, h.personal.vollzeit + h.personal.teilzeit]));
    const result = fuehreAus(s, { typ: 'personalabbau', haeuser: ids, prozent: 0.05 });
    expect(result.ok).toBe(true);
    for (const id of ids) {
      const h = s.haeuser.find((x) => x.id === id)!;
      expect(h.personal.vollzeit + h.personal.teilzeit).toBeCloseTo(vorher.get(id)! * 0.95, 5);
    }
  });

  test('Mehrfachschließung verwendet dieselben Regeln wie die Einzelaktion', () => {
    const s = neueWelt(2);
    const ids = portfolio(s).filter((h) => h.steuerbar).slice(0, 3).map((h) => h.id);
    const einzel = structuredClone(s);
    const vorschau = schliessungVorschau(s, ids);
    expect(vorschau.anzahl).toBe(3);
    expect(vorschau.gesamt).toBeGreaterThan(0);
    for (const id of ids) expect(fuehreAus(einzel, { typ: 'schliessen', haus: id }).ok).toBe(true);
    const sammel = fuehreAus(s, { typ: 'schliessen', haeuser: [...ids, ids[0]] });
    expect(sammel.ok).toBe(true);
    for (const id of ids) {
      expect(s.haeuser.find((h) => h.id === id)?.status)
        .toBe(einzel.haeuser.find((h) => h.id === id)?.status);
      expect(s.haeuser.find((h) => h.id === id)?.status).toBe('schliessung_verhandlung');
    }
    expect(s.cash).toBe(einzel.cash);
  });

  test('Nicht simulierte Häuser können nicht per Sammelschließung gesteuert werden', () => {
    const s = neueWelt(1);
    // Reine Datenhäuser gibt es im Standard nicht mehr; Regel an einem markierten Haus prüfen.
    s.haeuser[0].nurDaten = true;
    const id = s.haeuser[0].id;
    const vorher = structuredClone(s.haeuser.find((h) => h.id === id));
    expect(fuehreAus(s, { typ: 'schliessen', haeuser: [id] }).ok).toBe(false);
    expect(s.haeuser.find((h) => h.id === id)).toEqual(vorher);
  });
});

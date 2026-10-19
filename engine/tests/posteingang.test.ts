
import { neuesSpiel } from '../src/engine';
import { posteingang } from '../src/abfragen';
import { ereignisse, loeseEntscheidung } from '../src/ereignisse';
import { fuehreAus } from '../src/aktionen';
import type { Angebot, Entscheidung } from '../src/types';

const entscheidung = (id: string, frist: number): Entscheidung => ({
  id, typ: 'instandhaltung', titel: 'Brandschutz prüfen', text: 'Eine Investition ist erforderlich.',
  woche: 2, frist, optionen: [{ id: 'zahlen', label: 'Zahlen' }, { id: 'verschieben', label: 'Verschieben' }],
  standard: 'zahlen', daten: {},
});
const angebot = (id: string, frist: number): Angebot => ({
  id, typ: 'sonderposten', titel: 'Sonderposten', text: 'Ware', woche: 1, frist,
  wert: 2_000_000, status: 'offen',
});

describe('Posteingang', () => {
  test('offene Vorgänge strikt nach Frist und Dringlichkeit sortiert', () => {
    const s = neuesSpiel(1);
    s.woche = 8;
    s.entscheidungen.push(entscheidung('e-spaet', 14), entscheidung('e-sofort', 8));
    s.angebote.push(angebot('a-mittel', 10));
    const p = posteingang(s);
    expect(p.handeln.map((x) => x.id)).toEqual(['e-sofort', 'a-mittel', 'e-spaet']);
    expect(p.handeln.map((x) => x.restWochen)).toEqual([0, 2, 6]);
    expect(p.handeln[0].dringend).toBe(true);
    expect(p.handeln[1].dringend).toBe(false);
  });

  test('Standardtext ist das Optionslabel, Abfrage ist vollständig nebenwirkungsfrei', () => {
    const s = neuesSpiel(1);
    s.entscheidungen.push(entscheidung('e-1', 1));
    const vorher = JSON.stringify(s);
    const p = posteingang(s);
    expect(p.handeln[0].standard).toBe('Zahlen');
    expect(p.handeln[0].optionen).toHaveLength(2);
    expect(JSON.stringify(s)).toBe(vorher);
  });

  test('abgelehnte und verfallene Angebote erscheinen im Archiv', () => {
    const s = neuesSpiel(1);
    s.woche = 10;
    s.angebote.push({ ...angebot('a-alt', 3), status: 'verfallen', erledigtWoche: 9 });
    s.angebote.push(angebot('a-neu', 15));
    expect(fuehreAus(s, { typ: 'angebotAblehnen', angebot: 'a-neu' }).ok).toBe(true);
    const archiv = posteingang(s).erledigt;
    expect(archiv.map((x) => x.id)).toEqual(expect.arrayContaining(['a-alt', 'a-neu']));
    expect(archiv.find((x) => x.id === 'a-alt')?.ergebnis).toBe('Frist abgelaufen');
    expect(archiv.find((x) => x.id === 'a-neu')?.ergebnis).toBe('Abgelehnt');
  });

  test('Fristablauf löst die Standardoption aus und kennzeichnet das Protokoll', () => {
    const s = neuesSpiel(1);
    s.woche = 3;
    s.entscheidungen.push(entscheidung('e-frist', 3));
    s.angebote.push(angebot('a-frist', 3));
    ereignisse(s);
    expect(s.entscheidungen.some((x) => x.id === 'e-frist')).toBe(false);
    expect(s.entscheidungsprotokoll?.find((x) => x.id === 'e-frist')).toMatchObject({
      option: 'zahlen', ergebnis: 'Zahlen', woche: 3, standard: true,
    });
    expect(posteingang(s).erledigt.find((x) => x.id === 'a-frist')?.standard).toBe(true);
  });

  test('manuelle Entscheidung wird nicht als Fristablauf gekennzeichnet, Protokoll auf 52 Wochen begrenzt', () => {
    const s = neuesSpiel(2);
    s.woche = 60;
    s.entscheidungsprotokoll = [{ id: 'alt', titel: 'Alt', typ: 'alt', option: 'x', ergebnis: 'x', woche: 1, standard: false }];
    s.entscheidungen.push(entscheidung('e-manuell', 61));
    expect(loeseEntscheidung(s, 'e-manuell', 'verschieben')).toBeNull();
    expect(s.entscheidungsprotokoll?.map((x) => x.id)).toEqual(['e-manuell']);
    expect(s.entscheidungsprotokoll?.[0].standard).toBe(false);
  });
});

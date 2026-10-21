import { neuesSpiel, wocheAbspielen } from '../src/engine';
import { posteingang, formatCockpit } from '../src/abfragen';
import { hausTreiber } from '../src/treiber';
import { vertriebUebersicht } from '../src/vertrieb';
import { fuehreAus } from '../src/aktionen';
import type { Entscheidung } from '../src/types';

const summe = (n: number[]) => n.reduce((a,b) => a+b, 0);

describe('Q07: Vertriebssteuerung und Vorjahr', () => {
  test('52 Vorjahreswochen pro aktivem Haus, bitgleich für denselben Seed ohne Verschiebung des RNG', () => {
    const s = neuesSpiel(1);
    const t = neuesSpiel(1);
    expect(s.rng).toBe(t.rng);
    expect(s.vorjahrHistorie).toEqual(t.vorjahrHistorie);
    for (const h of s.haeuser.filter((x) => !x.nurDaten)) {
      const p = s.vorjahrHistorie?.[h.id];
      expect(p).toHaveLength(52);
      expect(p?.[0].woche).toBe(-52);
      expect(p?.[51].woche).toBe(-1);
      expect(p?.every((x) => Number.isFinite(x.umsatz) && Number.isFinite(x.db))).toBe(true);
    }
    expect(s.haeuser).toHaveLength(560);
    expect(s.historie).toHaveLength(0);
  });
  test.each([[1,0,-52,-1], [4,13,-39,12], [7,26,-26,25], [10,39,-13,38]] as const)(
    'Startmonat %i startet in Woche %i mit Vergleichsfenster %i bis %i',
    (startMonat, start, von, bis) => {
      const s = neuesSpiel(1, { startMonat });
      expect(s.startMonat).toBe(startMonat);
      expect(s.woche).toBe(start);
      const h = s.haeuser.find((x) => !x.nurDaten)!;
      expect(s.vorjahrHistorie?.[h.id]?.[0].woche).toBe(von);
      expect(s.vorjahrHistorie?.[h.id]?.[51].woche).toBe(bis);
      expect(s.bestellungen.every((x) => x.ankunft >= start)).toBe(true);
      expect(s.verbindlichkeiten.every((x) => x.faellig >= start - 1)).toBe(true);
    });
  test('O02 nutzt das simulierte Vorjahr bereits nach der ersten gespielten Woche', () => {
    const s = neuesSpiel(1);
    const h = s.haeuser.find((x) => !x.nurDaten)!;
    wocheAbspielen(s);
    const d = hausTreiber(s, h.id);
    expect(d).toBeDefined();
    expect(d?.vorjahr).toBeDefined();
    expect(d?.vorjahr?.von).toBe(-52);
    expect(d?.aktuell.umsatz).toBeGreaterThanOrEqual(0);
  });
  test('Format-, Regions-, Cluster- und Haussummen entsprechen exakt der Hausbasis', () => {
    const s = neuesSpiel(1);
    wocheAbspielen(s);
    const alle = vertriebUebersicht(s);
    const formate = formatCockpit(s);
    expect(alle.gesamt.anzahl).toBe(560);
    expect(summe(alle.formate.map((x) => x.anzahl))).toBe(560);
    expect(summe(alle.formate.map((x) => x.umsatz))).toBe(alle.gesamt.umsatz);
    expect(summe(formate.map((x) => x.umsatz))).toBe(alle.gesamt.umsatz);
    expect(summe(alle.zeilen.map((x) => x.umsatz))).toBe(alle.gesamt.umsatz);
    const west = vertriebUebersicht(s, { ebene: 'region', id: 'West' });
    expect(summe(west.zeilen.map((x) => x.umsatz))).toBe(west.gesamt.umsatz);
    const cluster = west.zeilen.find((x) => x.anzahl > 0)!;
    const kinder = vertriebUebersicht(s, { ebene: 'hauscluster', id: cluster.id });
    expect(kinder.gesamt.umsatz).toBe(cluster.umsatz);
    expect(summe(kinder.zeilen.map((x) => x.umsatz))).toBe(kinder.gesamt.umsatz);
    for (const format of ['warenhaus', 'schwester', 'sport', 'outlet'] as const) {
      const f = vertriebUebersicht(s, { format });
      expect(f.gesamt.umsatz).toBe(alle.formate.find((x) => x.format === format)?.umsatz);
    }
  });
  test('Wochen-, 4-Wochen-, Monats-, Quartals- und Jahresfilter sind additive Summen', () => {
    const s = neuesSpiel(2);
    for (let i=0; i<5; i++) wocheAbspielen(s);
    for (const zeitraum of ['woche','vier','monat','quartal','ytd'] as const) {
      const ue = vertriebUebersicht(s, { zeitraum, ebene:'alle' });
      expect(summe(ue.zeilen.map((x) => x.umsatz))).toBe(ue.gesamt.umsatz);
      expect(summe(ue.formate.map((x) => x.ebitda))).toBe(ue.gesamt.ebitda);
      expect(ue.gesamt.vorjahr).toBeDefined();
    }
  });
  test('Mietverträge kommen als eine wochenweise Sammelkarte; Entscheidungen bleiben einzeln ausführbar', () => {
    const s = neuesSpiel(3);
    const hs = s.haeuser.filter((h) => !h.nurDaten).slice(0, 2);
    const erzeuge = (id: string, nr: number): Entscheidung => ({
      id: 'miet-test-' + nr, typ: 'mietende', titel: 'Mietvertrag',
      text: 'Testangebot', woche: s.woche, frist: s.woche+8,
      optionen: [{ id:'verlaengern',label:'Verlängern' },{ id:'nachverhandeln',label:'Nachverhandeln' },
        { id:'auslaufen',label:'Kündigen' }],
      standard:'verlaengern', daten:{haus:id,markt:50000},
    });
    s.entscheidungen.push(erzeuge(hs[0].id,1), erzeuge(hs[1].id,2));
    const p = posteingang(s);
    const gruppiert = p.handeln.filter((x) => x.typ === 'mietvertraege');
    expect(gruppiert).toHaveLength(1);
    expect(gruppiert[0].mietvertraege).toHaveLength(2);
    expect(p.handeln.some((x) => x.typ === 'mietende')).toBe(false);
    expect(fuehreAus(s, { typ: 'entscheiden', id:'miet-test-1', option:'verlaengern' }).ok).toBe(true);
    expect(posteingang(s).handeln.find((x) => x.typ === 'mietvertraege')?.mietvertraege).toHaveLength(1);
  });
});

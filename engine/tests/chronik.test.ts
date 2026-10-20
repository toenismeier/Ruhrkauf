import { chronikErfolg, chronikUebersicht, fuehreAus, neuesSpiel, wocheAbspielen } from '../src';
import { chronikAktualisieren } from '../src/chronik';
import { hqKosten } from '../src/hq';
import { eroeffneInsolvenz } from '../src/prozesse';

describe('N12 Konzernchronik', () => {
  test('15 fiktive und chronologisch sortierte Stationen von 1886 bis 2027', () => {
    const s = neuesSpiel(1);
    const d = chronikUebersicht(s);
    expect(d.geschichte).toHaveLength(15);
    expect(d.geschichte[0]).toMatchObject({ jahr: 1886, familie: 1 });
    expect(d.geschichte.at(-1)).toMatchObject({ jahr: 2027 });
    expect(d.geschichte.map(x => x.jahr)).toEqual([...d.geschichte].map(x => x.jahr).sort((a, b) => a - b));
    expect(d.spiel).toEqual([]);
  });

  test('identischer Seed und Spielverlauf führen zu identischer Chronik', () => {
    const a = neuesSpiel(7);
    const b = neuesSpiel(7);
    for (let i = 0; i < 15; i++) {
      wocheAbspielen(a);
      wocheAbspielen(b);
    }
    expect(a.chronik).toEqual(b.chronik);
    expect(a.chronikStand).toEqual(b.chronikStand);
    expect(a.historie).toEqual(b.historie);
  });

  test('Ereignisabgleich verändert weder Liquidität noch RNG noch operative Daten', () => {
    const s = neuesSpiel(9);
    const vor = structuredClone(s);
    chronikAktualisieren(s);
    expect(s).toEqual(vor);
    const h = s.haeuser[0];
    h.status = 'geschlossen';
    const vorEreignis = structuredClone(s);
    chronikAktualisieren(s);
    expect(s.cash).toBe(vorEreignis.cash);
    expect(s.rng).toBe(vorEreignis.rng);
    expect(s.haeuser).toEqual(vorEreignis.haeuser);
    expect(s.chronik).toEqual(expect.arrayContaining([expect.objectContaining({ art: 'haus', bezug: h.id, woche: 0 })]));
    chronikAktualisieren(s);
    expect(s.chronik?.filter(e => e.bezug === h.id)).toHaveLength(1);
  });

  test('Insolvenzantrag und Planannahme werden als zwei Meilensteine gespeichert', () => {
    const s = neuesSpiel(5);
    eroeffneInsolvenz(s, 'Testfall');
    chronikAktualisieren(s);
    expect(s.chronik?.some(e => e.art === 'insolvenz')).toBe(true);
    s.phase = 'regulaer';
    s.insolvenz = undefined;
    chronikAktualisieren(s);
    expect(s.chronik?.some(e => e.art === 'plan')).toBe(true);
  });

  test('Vorstandswechsel, Quartalsrekord und Erfolg werden protokolliert und nicht dupliziert', () => {
    const s = neuesSpiel(11);
    const ressort = s.vorstand.ressorts.cfo;
    ressort.person = { ...ressort.person!, id: 'chronik-test-vorstand', name: 'Testperson Albrecht' };
    chronikAktualisieren(s);
    expect(s.chronik?.some(e => e.art === 'vorstand' && e.bezug === 'cfo')).toBe(true);
    s.quartale.push({ nr: 0, start: 0, planStandard: 0, ebitdaIst: 1000 });
    chronikAktualisieren(s, 12);
    expect(s.chronik?.some(e => e.art === 'quartal' && e.bezug === 'quartal-0')).toBe(true);
    chronikErfolg(s, 'aufbruch', 'Aufbruch');
    chronikErfolg(s, 'aufbruch', 'Aufbruch');
    expect(s.chronik?.filter(e => e.art === 'erfolg' && e.bezug === 'aufbruch')).toHaveLength(1);
  });

  test('Archiv ist freiwillig, kostet nur kleine Zusatzmiete und bleibt kündbar', () => {
    const s = neuesSpiel(13);
    const g = s.hq.gebaeude.find(g => g.etagen.some(e => e.gemietet))!;
    const e = g.etagen.find(e => e.gemietet)!;
    const vorher = { kosten: hqKosten(s), rng: s.rng, cash: s.cash, wirkung: structuredClone(s.hq.wirkung) };
    expect(fuehreAus(s, { typ: 'hqArchivSetzen', gebaeude: g.id, etage: e.nr, aktiv: true }).ok).toBe(true);
    const nachher = hqKosten(s);
    expect(nachher.miete - vorher.kosten.miete).toBeCloseTo(90 * g.mieteQmMonat * 12 / 52, 5);
    expect(nachher.personal).toBe(vorher.kosten.personal);
    expect(nachher.sach).toBe(vorher.kosten.sach);
    expect(nachher.strafen).toBe(vorher.kosten.strafen);
    expect(s.cash).toBe(vorher.cash);
    expect(s.rng).toBe(vorher.rng);
    expect(s.hq.wirkung).toEqual(vorher.wirkung);
    expect(fuehreAus(s, { typ: 'hqArchivSetzen', gebaeude: g.id, etage: e.nr, aktiv: false }).ok).toBe(true);
    expect(hqKosten(s)).toEqual(vorher.kosten);
  });

  test('Prognosen fügen der Chronik keine Meilensteine hinzu', () => {
    const s = neuesSpiel(17);
    const vor = JSON.stringify(s.chronik);
    s.prognose = true;
    s.haeuser[0].status = 'verkauft';
    chronikAktualisieren(s);
    expect(JSON.stringify(s.chronik)).toBe(vor);
  });
});

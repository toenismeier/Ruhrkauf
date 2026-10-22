import { STAEDTE, PREMIUM_HAEUSER } from '../src/daten';
import { KOORDINATEN } from '../src/standorte';
import { neuesSpiel, wocheAbspielen } from '../src';
import { ALT_WARENHAUS_STAEDTE, ALT_SPORT_STAEDTE } from '../src/massstab-alt';

describe('Maßstab Phase 1: Standortnetz', () => {
  const s = neuesSpiel(1);
  const metropolen = ['Berlin', 'Hamburg', 'München', 'Köln', 'Frankfurt', 'Düsseldorf', 'Stuttgart'];
  const top20Grossstaedte = new Set(STAEDTE.filter((st) => st[2] === 'grossstadt').slice(0, 20).map((st) => st[0]));

  test('genau sieben Metropolen; übrige Stadtklassen nach realer Größenordnung', () => {
    expect(STAEDTE.filter((st) => st[2] === 'metropole').map((st) => st[0])).toEqual(metropolen);
    expect(STAEDTE.filter((st) => st[2] === 'grossstadt')).toHaveLength(73);
    expect(STAEDTE.filter((st) => st[2] === 'mittelstadt')).toHaveLength(140);
    for (const st of STAEDTE) {
      if (metropolen.includes(st[0])) expect(st[2]).toBe('metropole');
      else expect(st[2]).not.toBe('metropole');
    }
  });
  test('exakt 561 Häuser in 220 realen Städten, alle mit Koordinaten', () => {
    expect(STAEDTE).toHaveLength(220);
    const unique = new Set(STAEDTE.map(([stadt]) => stadt));
    expect(unique.size).toBe(STAEDTE.length);
    for (const stadt of unique) {
      const p = KOORDINATEN[stadt];
      expect(p).toBeDefined();
      expect(p![0]).toBeGreaterThan(47);
      expect(p![0]).toBeLessThan(56);
      expect(p![1]).toBeGreaterThan(5);
      expect(p![1]).toBeLessThan(16);
    }
    expect(s.version).toBe(2);
    expect(s.haeuser).toHaveLength(561);
    expect(s.haeuser.filter((h) => h.format === 'warenhaus' && h.klasse !== 'premium')).toHaveLength(360);
    expect(s.haeuser.filter((h) => h.klasse === 'premium')).toHaveLength(5);
    expect(s.haeuser.filter((h) => h.format === 'sport')).toHaveLength(44);
    expect(s.haeuser.filter((h) => h.format === 'schwester')).toHaveLength(86);
    expect(s.haeuser.filter((h) => h.format === 'outlet')).toHaveLength(66);
    expect(new Set(s.haeuser.map((h) => h.id)).size).toBe(561);
  });

  test('Standortobergrenzen und historische Doppelstandorte', () => {
    let doppelteMittelstadt = 0;
    for (const [name, , cluster, , soll] of STAEDTE) {
      const hs = s.haeuser.filter((h) => h.stadt === name);
      const zaehle = (format: string) => hs.filter((h) => h.format === format && h.klasse !== 'premium').length;
      const hartwig = zaehle('warenhaus');
      const premium = hs.filter((h) => h.klasse === 'premium').length;
      const volkskauf = zaehle('schwester');
      const sport = zaehle('sport');
      const fundus = zaehle('outlet');
      expect([hartwig, premium, volkskauf, sport, fundus]).toEqual([soll.hartwig, soll.premium, soll.volkskauf, soll.sport, soll.fundus]);
      const max = cluster === 'metropole' ? [name === 'Berlin' ? 10 : 9, 5, 2, 2, 2, name === 'Berlin' ? 2 : 1]
        : cluster === 'grossstadt' ? [6, 3, 1, 1, 1, 0]
        : [2, 1, 1, 1, 0, 0];
      expect(hs.length).toBeLessThanOrEqual(max[0]);
      expect(hartwig).toBeLessThanOrEqual(max[1]);
      expect(volkskauf).toBeLessThanOrEqual(max[2]);
      expect(sport).toBeLessThanOrEqual(max[3]);
      expect(fundus).toBeLessThanOrEqual(max[4]);
      expect(premium).toBeLessThanOrEqual(max[5]);
      if (cluster === 'mittelstadt' && hartwig && volkskauf) doppelteMittelstadt++;
    }
    expect(doppelteMittelstadt).toBeLessThanOrEqual(15);
  });

  test('Hausklassen, Premium und FUNDUS-Lagen', () => {
    const alle = s.haeuser;
    expect(alle.filter((h) => h.hausklasse === 'A')).toHaveLength(45);
    expect(alle.filter((h) => h.hausklasse === 'B')).toHaveLength(115);
    expect(alle.filter((h) => h.hausklasse === 'C')).toHaveLength(200);
    expect(alle.filter((h) => h.hausklasse === 'A' && h.cluster === 'mittelstadt')).toHaveLength(0);
    expect(alle.filter((h) => h.hausklasse === 'C' && h.cluster === 'mittelstadt').length).toBeGreaterThan(100);
    for (const h of alle.filter((x) => x.format === 'warenhaus' && x.klasse !== 'premium')) {
      if (h.hausklasse === 'A') expect(h.cluster === 'metropole' || top20Grossstaedte.has(h.stadt)).toBe(true);
      if (h.hausklasse === 'B') expect(h.cluster).toBe('grossstadt');
    }
    const hartwigStaedte = new Set(alle.filter((h) => h.format === 'warenhaus').map((h) => h.stadt));
    for (const stadt of hartwigStaedte) {
      const hartwig = alle.filter((h) => h.format === 'warenhaus' && h.stadt === stadt);
      // Berlin besitzt zwei selbständige Premium-1a-Lagen.
      expect(hartwig.filter((h) => h.lage === '1a')).toHaveLength(
        Math.max(1, hartwig.filter((h) => h.klasse === 'premium').length));
      expect(hartwig.filter((h) => h.lage !== '1a').every((h) => ['b', 'stadtteil', 'center'].includes(h.lage))).toBe(true);
    }
    expect(alle.filter((h) => h.format === 'schwester' && h.region === 'West').length).toBeGreaterThan(43);
    expect(alle.filter((h) => h.format === 'schwester' && h.cluster === 'mittelstadt').length).toBeGreaterThan(43);
    expect(alle.filter((h) => h.format === 'outlet' && h.lage === 'rand')).toHaveLength(46);
    expect(alle.filter((h) => h.format === 'outlet' && h.lage === 'b')).toHaveLength(20);
    for (const p of PREMIUM_HAEUSER) {
      expect(alle.filter((h) => h.premiumSchluessel === p.schluessel && h.stadt === p.stadt && h.name === p.name)).toHaveLength(1);
    }
  });

  test('IDs W001–W130 behalten ihre Orte', () => {
    for (let i = 0; i < 130; i++) {
      const h = s.haeuser.find((h) => h.id === `W${String(i + 1).padStart(3, '0')}`)!;
      expect(h.stadt).toBe(ALT_WARENHAUS_STAEDTE[i]);
    }
  });

  test('S001–S044 bleiben stabil; ausschließlich der dritte Standort aus Berlin und München zieht um', () => {
    const umgezogeneIds: string[] = [];
    for (let i = 0; i < ALT_SPORT_STAEDTE.length; i++) {
      const h = s.haeuser.find((h) => h.id === `S${String(i + 1).padStart(3, '0')}`)!;
      if (h.stadt !== ALT_SPORT_STAEDTE[i]) umgezogeneIds.push(h.id);
    }
    expect(umgezogeneIds).toEqual(['S003', 'S008']);
    expect(s.haeuser.find((h) => h.id === 'S003')!.stadt).toBe('Gelsenkirchen');
    expect(s.haeuser.find((h) => h.id === 'S008')!.stadt).toBe('Halle');
  });

  test('Volkskauf und FUNDUS erzeugen keine Wirtschaft', () => {
    for (const h of s.haeuser.filter((h) => h.nurDaten)) {
      expect(h.status).toBe('offen');
      expect(h.personal.vollzeit + h.personal.teilzeit + h.personal.aushilfen).toBe(0);
      expect(h.miete.mieteWoche).toBe(0);
      expect(h.flaechen.length).toBeGreaterThan(0);
    }
    s.cash = 2_000_000_000;
    wocheAbspielen(s);
    for (const h of s.haeuser.filter((h) => h.nurDaten)) expect(h.kpi).toBeUndefined();
  });

  test('gleicher Seed liefert gleiche Stammdaten', () => {
    expect(neuesSpiel(1).haeuser).toEqual(neuesSpiel(1).haeuser);
  });
});

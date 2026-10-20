import { ERFOLGE, erfolgeUebersicht, erfolgeWoche, neuesSpiel, wocheAbspielen } from '../src';
import { botTief } from '../scripts/bot';
import type { GameState } from '../src';

describe('N03 Erfolge und Abzeichen', () => {
  test('30 eindeutige Erfolge aus fünf Gruppen, höchstens fünf Geheimnisse', () => {
    expect(ERFOLGE).toHaveLength(30);
    expect(new Set(ERFOLGE.map(e => e.id)).size).toBe(30);
    expect(new Set(ERFOLGE.map(e => e.gruppe)).size).toBe(5);
    expect(ERFOLGE.filter(e => e.geheim).length).toBeLessThanOrEqual(5);
  });

  test('freigeschaltete Woche bleibt gespeichert, erneute Prüfung erzeugt keine Dublette', () => {
    const s = neuesSpiel(1);
    for (let i = 0; i < 26; i++) wocheAbspielen(s);
    expect(s.erfolge?.['erste-26']).toBe(26);
    expect(erfolgeWoche(s)).toEqual([]);
    expect(erfolgeUebersicht(s).find(e => e.id === 'erste-26')?.freigeschaltet).toBe(26);
  });

  test('alte Spielstände ohne Erfolge werden beim nächsten Wochenabschluss migriert', () => {
    const s = neuesSpiel(7);
    delete s.erfolge;
    delete s.erfolgeVerlauf;
    const vorher = JSON.stringify(s);
    expect(erfolgeUebersicht(s)).toHaveLength(30);
    expect(JSON.stringify(s)).toEqual(vorher);
    wocheAbspielen(s);
    expect(s.erfolge).toBeDefined();
    expect(s.erfolgeVerlauf).toBeDefined();
  });

  test('Ausschalten und Prognosen verändern Erfolge nicht', () => {
    const s = neuesSpiel(10);
    s.erfolgeAktiv = false;
    for (let i = 0; i < 13; i++) wocheAbspielen(s);
    expect(s.erfolge).toEqual({});
    expect(s.erfolgeVerlauf).toBeUndefined();
    expect(erfolgeUebersicht(s)).toEqual([]);
    s.erfolgeAktiv = true;
    s.prognose = true;
    const vorher = JSON.stringify(s);
    expect(erfolgeWoche(s)).toEqual([]);
    expect(JSON.stringify(s)).toEqual(vorher);
  });

  test('kein Einfluss auf wirtschaftliche Kennzahlen oder RNG (aktiv gegen aus)', () => {
    const a = neuesSpiel(19);
    const b = neuesSpiel(19);
    b.erfolgeAktiv = false;
    for (let i = 0; i < 28; i++) {
      const ka = wocheAbspielen(a), kb = wocheAbspielen(b);
      expect(ka).toEqual(kb);
      expect(a.rng).toBe(b.rng);
      expect(a.cash).toBe(b.cash);
      expect(a.wettbewerbRng).toBe(b.wettbewerbRng);
    }
  });

  test('Bot C erreicht mit Seed 1 mindestens acht Erfolge über fünf Jahre', () => {
    const s: GameState = neuesSpiel(1);
    for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) {
      botTief(s);
      wocheAbspielen(s);
    }
    expect(s.woche).toBe(260);
    expect(Object.keys(s.erfolge ?? {}).length).toBeGreaterThanOrEqual(8);
  });

  test('Format-Erfolge verlangen echte Formate-Kennzahlen; keine falsche Freischaltung', () => {
    const s = neuesSpiel(2);
    expect(erfolgeUebersicht(s).find(x => x.id === 'fundus-profitabel')?.freigeschaltet).toBeUndefined();
    s.formatErfolge = { fundusDb: 1, volkskaufSaniert: true };
    wocheAbspielen(s);
    expect(s.erfolge?.['fundus-profitabel']).toBe(1);
    expect(s.erfolge?.['volkskauf-saniert']).toBe(1);
  });
});

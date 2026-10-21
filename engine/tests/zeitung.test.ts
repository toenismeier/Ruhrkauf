import { neuesSpiel, wocheAbspielen, fuehreAus } from '../src';
import { botTief } from '../scripts/bot';
import { zeitungArchiv, zeitungWoche, ZEITUNG_ARTIKELARTEN } from '../src/zeitung';

describe('Der Handelsbote', () => {
  test('gleicher Seed und gleiche Wochen ergeben identische Ausgabe', () => {
    const a = neuesSpiel(17);
    const b = neuesSpiel(17);
    for (let i = 0; i < 4; i++) { wocheAbspielen(a); wocheAbspielen(b); }
    expect(zeitungArchiv(a)).toEqual(zeitungArchiv(b));
    expect(zeitungArchiv(a)).toHaveLength(4);
    expect(zeitungArchiv(a)[0].reiter).toEqual(['Top', 'Handel', 'Konzern', 'Markt', 'Politik']);
    expect(zeitungArchiv(a)[0].aufmacher.text.split('.').length).toBeGreaterThanOrEqual(3);
  });

  test('abgeschaltet: Simulation, Zufallsstrom und IDs bleiben unverändert', () => {
    const mit = neuesSpiel(8);
    const ohne = neuesSpiel(8);
    expect(fuehreAus(ohne, { typ: 'zeitungAktiv', an: false }).ok).toBe(true);
    for (let i = 0; i < 8; i++) {
      const k1 = wocheAbspielen(mit);
      const k2 = wocheAbspielen(ohne);
      expect(k1).toEqual(k2);
      expect(mit.rng).toBe(ohne.rng);
      expect(mit.wettbewerbRng).toBe(ohne.wettbewerbRng);
      expect(mit.zaehler).toBe(ohne.zaehler);
      expect(mit.stakeholder).toEqual(ohne.stakeholder);
    }
    expect(zeitungArchiv(mit)).toHaveLength(8);
    expect(zeitungArchiv(ohne)).toHaveLength(0);
  });

  test('mindestens 40 feste Artikelarten vorhanden', () => {
    expect(new Set(ZEITUNG_ARTIKELARTEN).size).toBeGreaterThanOrEqual(40);
  });

  test('Gläubigerversammlung erscheint als Aufmacher', () => {
    const s = neuesSpiel(4);
    s.meldungen.push({ woche: 0, typ: 'insolvenz', text: 'Die Gläubigerversammlung stimmt über den Insolvenzplan ab.' });
    zeitungWoche(s);
    expect(zeitungArchiv(s)[0].aufmacher.art).toBe('glaeubiger');
    expect(zeitungArchiv(s)[0].aufmacher.text).toContain('Gläubigerversammlung');
    const alteRng = s.rng;
    zeitungWoche(s);
    expect(zeitungArchiv(s)).toHaveLength(1);
    expect(s.rng).toBe(alteRng);
  });

  test('Interview: sachliche Standardantwort ist neutral, Zitat in nächster Ausgabe', () => {
    const s = neuesSpiel(11);
    s.woche = 9;
    const rng = s.rng, zaehler = s.zaehler;
    zeitungWoche(s);
    const e = s.entscheidungen.find((x) => x.typ === 'interview');
    expect(e).toBeDefined();
    expect(e?.standard).toBe('sachlich');
    expect(s.rng).toBe(rng);
    expect(s.zaehler).toBe(zaehler);
    s.woche = 10;
    const vor = { ...s.stakeholder };
    expect(fuehreAus(s, { typ: 'entscheiden', id: e!.id, option: 'sachlich' }).ok).toBe(true);
    // Standard bleibt neutral (Regel: ohne Eingriff keine Wirkung); offensiv/ausweichend wirken.
    expect(s.stakeholder).toEqual(vor);
    zeitungWoche(s);
    expect([zeitungArchiv(s).at(-1)!.aufmacher, ...zeitungArchiv(s).at(-1)!.meldungen].some((x) => x.art === 'interview' && x.text.includes('„'))).toBe(true);
  });

  test('Bot C beantwortet eine offene Interviewanfrage sachlich', () => {
    const s = neuesSpiel(19);
    s.woche = 9;
    zeitungWoche(s);
    s.woche = 10;
    botTief(s);
    const protokoll = (s.entscheidungsprotokoll ?? []).find((x) => x.typ === 'interview');
    expect(protokoll?.option).toBe('sachlich');
    expect(s.entscheidungen.some((x) => x.typ === 'interview')).toBe(false);
  });

  test('Abschalten entfernt offene Interviews ohne Stakeholder-Wirkung', () => {
    const s = neuesSpiel(20);
    s.woche = 9;
    zeitungWoche(s);
    const vorher = { ...s.stakeholder };
    fuehreAus(s, { typ: 'zeitungAktiv', an: false });
    expect(s.entscheidungen.some((x) => x.typ === 'interview')).toBe(false);
    expect(s.stakeholder).toEqual(vorher);
  });

  test('Archiv hält nur die jüngsten 104 Ausgaben, auch nach dem Umschalten', () => {
    const s = neuesSpiel(31);
    for (let w = 0; w < 110; w++) {
      s.woche = w;
      zeitungWoche(s);
    }
    expect(zeitungArchiv(s)).toHaveLength(104);
    expect(zeitungArchiv(s)[0].woche).toBe(6);
    expect(zeitungArchiv(s).at(-1)!.woche).toBe(109);
    fuehreAus(s, { typ: 'zeitungAktiv', an: false });
    s.woche = 110;
    zeitungWoche(s);
    expect(zeitungArchiv(s)).toHaveLength(104);
  });

  test('Saisonredaktion: Weihnachtsquartal und Bilanzierung', () => {
    const s = neuesSpiel(42);
    s.woche = 48;
    zeitungWoche(s);
    expect(zeitungArchiv(s)[0].meldungen.some((x) => x.art === 'weihnachten') || zeitungArchiv(s)[0].aufmacher.art === 'weihnachten').toBe(true);
    s.woche = 51;
    zeitungWoche(s);
    expect([zeitungArchiv(s).at(-1)!.aufmacher, ...zeitungArchiv(s).at(-1)!.meldungen].some((x) => x.art === 'quartalsblick')).toBe(true);
  });
});

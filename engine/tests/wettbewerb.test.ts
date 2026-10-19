import { fuehreAus, neuesSpiel, wocheAbspielen, wettbewerbAus, wettbewerbFuerGrafik, wettbewerbUebersicht } from '../src';
import type { GameState, Wettbewerber } from '../src';
import { wettbewerbWoche, wettbewerbNachfrageFaktor } from '../src/wettbewerb';
import { ereignisse, neueEntscheidung } from '../src/ereignisse';
import { botTief } from '../scripts/bot';
import { KOORDINATEN } from '../src/standorte';

jest.setTimeout(120000);

describe('Wettbewerber: Initialisierung', () => {
  const s = neuesSpiel(1);
  test('jede Stadt hat einen plausiblen Bestand und die Startkalibrierung bleibt exakt', () => {
    const st = new Set(s.haeuser.map((h) => h.stadt));
    for (const name of st) {
      const c = s.haeuser.find((h) => h.stadt === name)!.cluster;
      const n = s.wettbewerber.filter((w) => w.stadt === name).length;
      const [lo, hi] = { metropole: [3, 5], grossstadt: [1, 3], mittelstadt: [0, 1] }[c];
      expect(n).toBeGreaterThanOrEqual(lo);
      expect(n).toBeLessThanOrEqual(hi);
    }
    for (const h of s.haeuser) {
      expect(Math.abs(wettbewerbAus(s, h) - h.einzug.wettbewerb)).toBeLessThanOrEqual(0.05);
      expect(wettbewerbNachfrageFaktor(s, h, h.format === 'sport' ? 'sporttextil' : 'damen')).toBeCloseTo(1, 10);
    }
  });
  test('Namen, Stadtbilddaten und Umkreisprüfung', () => {
    expect(wettbewerbUebersicht(s).length).toBe(s.wettbewerber.length);
    const berlin = wettbewerbFuerGrafik(s, 'Berlin');
    expect(berlin.length).toBeGreaterThanOrEqual(3);
    for (const w of berlin) {
      expect(w.form).toBeGreaterThanOrEqual(0);
      expect(w.form).toBeLessThanOrEqual(4);
      expect(w.rabatt).toBe(0);
    }
    for (const w of s.wettbewerber) expect(w.id).toMatch(/^C[0-9]+$/);
    for (const a of s.wettbewerber) for (const b of s.wettbewerber) {
      if (a.id >= b.id || a.name !== b.name || a.stadt === b.stadt) continue;
      const x = KOORDINATEN[a.stadt], y = KOORDINATEN[b.stadt];
      if (!x || !y) continue;
      const km = Math.hypot((x[0] - y[0]) * 111, (x[1] - y[1]) * 111 * Math.cos((x[0] + y[0]) / 2 * Math.PI / 180));
      expect(km).toBeGreaterThanOrEqual(28);
    }
  });
});

describe('Wettbewerber: Dynamik', () => {
  test('gleicher Seed und Bot C: 260 Wochen identische Wettbewerbsfolge', () => {
    const spiele = (seed: number) => {
      const s = neuesSpiel(seed);
      for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) {
        botTief(s);
        wocheAbspielen(s);
      }
      return { konkurrenz: s.wettbewerber, rng: s.wettbewerbRng, meldungen: s.meldungen.filter((m) => /Wettbewerber|eröffnet|kontert|Räumungsverkauf/.test(m.text)), wochen: s.woche };
    };
    expect(spiele(1)).toEqual(spiele(1));
  });
  test('ohne Wettbewerbsereignisse reproduziert eigener RNG die Alt-Simulation', () => {
    const s = neuesSpiel(1), kontrolle = neuesSpiel(1);
    s.wettbewerbDeaktiviert = true;
    kontrolle.wettbewerbDeaktiviert = true;
    s.cash = kontrolle.cash = 5e9;
    for (let i = 0; i < 52; i++) {
      fuehreAus(s, { typ: 'sammelfreigabe' });
      fuehreAus(kontrolle, { typ: 'sammelfreigabe' });
      wocheAbspielen(s);
      wocheAbspielen(kontrolle);
    }
    expect(s.historie).toEqual(kontrolle.historie);
    for (const h of s.haeuser) expect(h.einzug.wettbewerb).toBe(h.wettbewerbStart);
  });
  test('Eröffnungs- und Rabattdruck sinkt nach Phasenende, wirkt aber während der Phase', () => {
    const s = neuesSpiel(2);
    const h = s.haeuser.find((x) => s.wettbewerber.some((w) => w.stadt === x.stadt && w.art === 'modehaus'))!;
    const w = s.wettbewerber.find((x) => x.stadt === h.stadt && x.art === 'modehaus')!;
    const zuvor = wettbewerbNachfrageFaktor(s, h, 'damen');
    w.preisdruck = 0.5; w.aktionVon = s.woche; w.aktionBis = s.woche + 2;
    expect(wettbewerbNachfrageFaktor(s, h, 'damen')).toBeLessThan(zuvor);
    s.woche = 2; s.prognose = true; wettbewerbWoche(s);
    expect(wettbewerbNachfrageFaktor(s, h, 'damen')).toBeCloseTo(zuvor, 10);
  });
  test('Schließung löst mit fixem Wettbewerbsseed Nachnutzung in 26 bis 78 Wochen aus', () => {
    const s = neuesSpiel(1);
    s.wettbewerbRng = 0; // Erste Mulberry32-Ziehung unter 0,35.
    const h = s.haeuser.find((x) => x.format === 'warenhaus' && x.status === 'offen')!;
    h.status = 'geschlossen';
    wettbewerbWoche(s);
    const geplant = s.wettbewerbNachnutzungen.find((n) => n.haus === h.id)!;
    expect(geplant).toBeDefined();
    expect(geplant.woche).toBeGreaterThanOrEqual(26);
    expect(geplant.woche).toBeLessThanOrEqual(78);
    s.woche = geplant.woche; wettbewerbWoche(s);
    expect(s.wettbewerber.some((w) => w.inHartwigGebaeude === h.id)).toBe(true);
  });
  test('Hartwig-Aktion kann Wettbewerberkonter auslösen', () => {
    const s = neuesSpiel(1);
    s.marketing.aktionen = [{
      id: 'test', name: 'Hartwig-Aktion', rabatt: 0.25, start: 0, ende: 3, scope: { typ: 'alle' },
      kontrollHaeuser: [], kosten: 0, _mehrumsatzWahr: 0, _rohertragseffektWahr: 0, bereiche: ['damen'],
    }];
    wettbewerbWoche(s);
    expect(s.wettbewerber.some((w) => w.konterVon !== undefined)).toBe(true);
    const vorher = s.wettbewerber.filter((w) => w.konterVon !== undefined).length;
    s.woche = 1;
    wettbewerbWoche(s);
    expect(s.wettbewerber.filter((w) => w.aktionVon !== undefined).length).toBeGreaterThan(0);
    expect(vorher).toBeGreaterThan(0);
  });
  test('Großeröffnung: nicht beantwortete Entscheidung nutzt Standardoption', () => {
    const s = neuesSpiel(3);
    const wb = s.wettbewerber[0] as Wettbewerber;
    neueEntscheidung(s, {
      typ: 'wettbewerb_eroeffnung', frist: 3, titel: 'Test', text: 'Test',
      optionen: [{ id: 'aktion', label: 'Aktion' }, { id: 'nichts', label: 'Nichts tun' }],
      standard: 'nichts', daten: { wettbewerber: wb.id },
    });
    s.woche = 3;
    ereignisse(s);
    expect(s.entscheidungen.some((e) => e.typ === 'wettbewerb_eroeffnung')).toBe(false);
    expect(wb.abwehrBis).toBeUndefined();
  });
  test('Übernahme schafft eigenen Outlet-Standort und belastet die Liquidität', () => {
    const s = neuesSpiel(1);
    s.cash = 5e9;
    const h = s.haeuser.find((x) => x.format === 'warenhaus' && s.wettbewerber.some((w) => w.stadt === x.stadt))!;
    const w = s.wettbewerber.find((x) => x.stadt === h.stadt)!;
    s.angebote.push({ id: 'wb-test', typ: 'uebernahme', wettbewerberId: w.id, woche: 0, frist: 8, titel: 'Test', text: 'Test', status: 'offen' });
    const cash = s.cash;
    expect(fuehreAus(s, { typ: 'angebotUebernehmen', angebot: 'wb-test', modus: 'outlet' }).ok).toBe(true);
    expect(s.haeuser.some((x) => x.id === 'O' + w.id && x.format === 'warenhaus')).toBe(true);
    expect(w.status).toBe('geschlossen');
    expect(s.cash).toBeLessThan(cash);
  });
});

describe('Abnahme: Bilanz und Überlebensfähigkeit', () => {
  test('Ausgangslage bleibt im ersten Jahr bei Umsatz und EBITDA innerhalb von 1 %', () => {
    const lauf = (aktiv: boolean) => {
      const s = neuesSpiel(1);
      s.cash = 5e9;
      if (!aktiv) s.wettbewerbDeaktiviert = true;
      for (let i = 0; i < 52; i++) {
        fuehreAus(s, { typ: 'sammelfreigabe' });
        wocheAbspielen(s);
      }
      return s.historie.reduce((sum, k) => ({ umsatz: sum.umsatz + k.umsatz, ebitda: sum.ebitda + k.ebitda }), { umsatz: 0, ebitda: 0 });
    };
    const basis = lauf(false), neu = lauf(true);
    expect(Math.abs(neu.umsatz - basis.umsatz) / Math.abs(basis.umsatz)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(neu.ebitda - basis.ebitda) / Math.abs(basis.ebitda)).toBeLessThanOrEqual(0.01);
  });
  test('Bot C überlebt auf Seeds 1 bis 3 fünf Jahre', () => {
    for (const seed of [1, 2, 3]) {
      const s = neuesSpiel(seed);
      for (let i = 0; i < 260 && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
      expect({ seed, phase: s.phase, woche: s.woche }).toEqual({ seed, phase: 'regulaer', woche: 260 });
    }
  });
});

describe('Altzustand ohne Wettbewerbsdynamik', () => {
  test('Bot C besteht bei Seeds 2 und 3 die Gläubigerversammlung', () => {
    for (const seed of [2, 3]) {
      const s = neuesSpiel(seed);
      s.wettbewerbDeaktiviert = true;
      for (let i = 0; i < 40 && s.phase !== 'zerschlagen'; i++) { botTief(s); wocheAbspielen(s); }
      expect({ seed, phase: s.phase }).toEqual({ seed, phase: 'regulaer' });
    }
  });
});

describe('Schwierigkeit und Wettbewerbsdruck', () => {
  test('identische neue Konkurrenz wirkt auf leicht schwächer als mittel und schwer', () => {
    const effekt = (schwierigkeit: 'leicht' | 'mittel' | 'schwer') => {
      const s = neuesSpiel(12, { schwierigkeit });
      const h = s.haeuser.find((x) => x.format === 'warenhaus')!;
      const muster = s.wettbewerber[0];
      s.wettbewerber.push({
        ...muster, id: 'C9999', art: 'modehaus', stadt: h.stadt, lage: h.lage,
        grundflaecheQm: 3200, staerke: 0.7, status: 'eroeffnung', seit: 1, bis: 4,
        preisdruck: 0.25, aktionVon: 0, aktionBis: 4,
      });
      return wettbewerbNachfrageFaktor(s, h, 'damen');
    };
    const leicht = effekt('leicht'), mittel = effekt('mittel'), schwer = effekt('schwer');
    expect(leicht).toBeGreaterThan(mittel);
    expect(mittel).toBeGreaterThan(schwer);
  });
});

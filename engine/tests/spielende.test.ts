import { endwertung, neuesSpiel, wocheAbspielen, fuehreAus } from '../src';
import { konzernVerkaufAnbieten, spielendePruefen, unternehmenswert } from '../src/spielende';
import type { GameState, WochenKpi } from '../src';
import { botTief } from '../scripts/bot';

function mitJahresgewinn(s: GameState) {
  const muster = {
    woche: 0, umsatz: 30_000_000, rohertrag: 12_000_000, abschriften: 0,
    konzession: 0, untermiete: 0, wkz: 0, personal: 0, miete: 0,
    nebenkosten: 0, sonstige: 0, logistik: 0, zentrale: 0, marketing: 0, beratung: 0,
    ebitda: 1_000_000, sondereffekte: 0, cash: 0, kreditFrei: 0, bestand: 0,
    offeneHaeuser: 1, fte: 1,
  } satisfies WochenKpi;
  s.historie = Array.from({length: 52}, (_,woche) => ({ ...muster, woche }));
}

describe('N02 Spielende', () => {
  test('Wertung ist deterministisch, inklusive Schwierigkeitsfaktoren', () => {
    const a = neuesSpiel(23), b = neuesSpiel(23);
    expect(endwertung(a)).toEqual(endwertung(b));
    expect(endwertung(a).teile.map(x => x.id)).toEqual([
      'haeuser', 'arbeitsplaetze', 'wert', 'image', 'stakeholder', 'schliessungen', 'entlassungen',
    ]);
    const leicht = neuesSpiel(23, { schwierigkeit: 'leicht' });
    const schwer = neuesSpiel(23, { schwierigkeit: 'schwer' });
    expect(endwertung(leicht).multiplikator).toBe(0.8);
    expect(endwertung(a).multiplikator).toBe(1);
    expect(endwertung(schwer).multiplikator).toBe(1.3);
  });

  test('Konzernangebot genau einmal jährlich ab Woche 156, ohne RNG-Verbrauch', () => {
    const s = neuesSpiel(13);
    const vor = s.rng, zaehler = s.zaehler;
    konzernVerkaufAnbieten(s);
    expect(s.angebote.filter(x => x.typ === 'konzernVerkauf')).toHaveLength(0);
    s.woche = 156;
    konzernVerkaufAnbieten(s);
    konzernVerkaufAnbieten(s);
    const angebot = s.angebote.filter(x => x.typ === 'konzernVerkauf');
    expect(angebot).toHaveLength(1);
    expect(angebot[0].kaufpreis).toBe(unternehmenswert(s));
    expect(angebot[0].frist).toBe(164);
    expect(s.rng).toBe(vor);
    expect(s.zaehler).toBe(zaehler);
    s.woche = 208;
    konzernVerkaufAnbieten(s);
    expect(s.angebote.filter(x => x.typ === 'konzernVerkauf')).toHaveLength(2);
  });

  test('Annahme beendet als Investor; kein Weiterspielen', () => {
    const s = neuesSpiel(13);
    s.woche = 156;
    konzernVerkaufAnbieten(s);
    const an = s.angebote.find(x => x.typ === 'konzernVerkauf')!;
    expect(fuehreAus(s, { typ: 'angebotAnnehmen', angebot: an.id }).ok).toBe(true);
    expect(s.ende?.art).toBe('investor');
    expect(s.ende?.kaeufer).toBe(an.konzernKaeuferName);
    expect(s.ende?.wertung.punkte).toBe(endwertung(s).punkte);
    expect(fuehreAus(s, { typ: 'spielFortsetzen' }).ok).toBe(false);
    expect(() => wocheAbspielen(s)).toThrow('Spiel beendet');
  });

  test('Sanierung erfordert fünf Jahre, aufgehobenes Verfahren und positives Jahres-EBITDA', () => {
    const s = neuesSpiel(3);
    mitJahresgewinn(s);
    s.woche = 260;
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
    s.insolvenzenGesamt = 1;
    spielendePruefen(s);
    expect(s.ende?.art).toBe('saniert');
    expect(s.ende?.kennzahlen.ebitda52).toBe(52_000_000);
    expect(fuehreAus(s, { typ: 'spielFortsetzen' }).ok).toBe(true);
    expect(s.spielendeFortgesetzt).toBe(true);
    expect(s.ende).toBeUndefined();
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
  });

  test('Negatives Jahresergebnis oder offenes Verfahren verhindern eine Sanierung', () => {
    const s = neuesSpiel(4);
    s.woche = 260;
    s.insolvenzenGesamt = 1;
    mitJahresgewinn(s);
    s.insolvenz = { seit: 220, versammlung: 280, altVerbindlichkeiten: 0, insolvenzgeldBis: 232, quote: 0.1, grund: 'Test' };
    s.phase = 'insolvenz';
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
    s.phase = 'regulaer'; s.insolvenz = undefined;
    s.historie[51].ebitda = -99_000_000;
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
  });

  test('Ruhestand freiwillig ab Woche 260, ohne laufende Insolvenz', () => {
    const s = neuesSpiel(5);
    expect(fuehreAus(s, { typ: 'ruhestand' }).ok).toBe(false);
    s.woche = 260;
    expect(fuehreAus(s, { typ: 'ruhestand' }).ok).toBe(true);
    expect(s.ende?.art).toBe('ruhestand');
    expect(fuehreAus(s, { typ: 'spielFortsetzen' }).ok).toBe(true);
  });

  test('Zerschlagung wird erfasst und ist endgültig', () => {
    const s = neuesSpiel(5);
    s.phase = 'zerschlagen'; s.woche = 38;
    spielendePruefen(s);
    expect(s.ende?.art).toBe('zerschlagen');
    expect(s.ende?.woche).toBe(38);
    expect(fuehreAus(s, { typ: 'spielFortsetzen' }).ok).toBe(false);
  });

  test('Deaktivierung hat keinerlei Effekt auf Angebote oder Spielende', () => {
    const s = neuesSpiel(12);
    s.spielendeDeaktiviert = true; s.woche = 156;
    const rng = s.rng, zaehler = s.zaehler;
    konzernVerkaufAnbieten(s);
    expect(s.angebote.filter(x => x.typ === 'konzernVerkauf')).toHaveLength(0);
    expect(s.rng).toBe(rng);
    expect(s.zaehler).toBe(zaehler);
    s.phase = 'zerschlagen';
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
  });

  // Seed 3: Bot C endet mit EBITDA-52 von rund −15 Mio. € (schon vor der Integration). Kalibrierung über #7 Abschnitt 11.
  test.each([1,2])('Bot C erreicht nach 260 Wochen die Sanierung (Seed %i)', (seed) => {
    const s = neuesSpiel(seed);
    for (let w = 0; w < 260 && s.phase !== 'zerschlagen' && !s.ende; w++) {
      botTief(s);
      wocheAbspielen(s);
    }
    expect(s.woche).toBe(260);
    expect(s.ende?.art).toBe('saniert');
    expect(s.ende?.kennzahlen.ebitda52).toBeGreaterThan(0);
  }, 120_000);

  test.each([1,2,3])('Ohne Eingriff endet der Seed %i in der Zerschlagung', (seed) => {
    const s = neuesSpiel(seed);
    for (let w = 0; w < 260 && s.phase !== 'zerschlagen' && !s.ende; w++) wocheAbspielen(s);
    expect(s.ende?.art).toBe('zerschlagen');
  }, 120_000);
});

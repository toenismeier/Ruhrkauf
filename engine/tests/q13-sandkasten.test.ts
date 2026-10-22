// Q13: Unbegrenzte Finanzierung ohne fiktive Cash-Zuführung.
import { cockpit, fuehreAus, neuesSpiel, szenarioKonfiguration, szenarioZiel, wocheAbspielen } from '../src';
import { erfolgeUebersicht } from '../src/erfolge';
import { spielendePruefen } from '../src/spielende';

jest.setTimeout(180_000);

describe('Q13 Sandkasten: unbegrenzte Finanzierung', () => {
  test('Teure Spieleraktionen und Wareneingang trotz negativer Liquidität', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('sandkasten'));
    expect(cockpit(s).geldUnbegrenzt).toBe(true);
    s.cash = -500_000_000;
    s.kreditlinie = 0;
    s.kapitalflussStartCash = s.cash;

    const premium = s.haeuser.find(h => h.klasse === 'premium' && h.status === 'offen')!;
    const haus = s.haeuser.find(h => h.status === 'offen' && h.klasse !== 'premium' && !h.nurDaten)!;
    const schliessung = s.haeuser.find(h => h.status === 'offen' && !h.nurDaten &&
      h.id !== haus.id && h.id !== premium.id)!;
    expect(fuehreAus(s, { typ: 'premiumInvestition', haus: premium.id, betrag: 100_000_000 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'umbauPlanen', haus: haus.id, etage: haus.etagen[0], stufe: 'komplett' }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'schliessen', haus: schliessung.id }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'marktbeobachtungStufe', stufe: 1 }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'onlineFulfillment', modell: 'eigen' }).ok).toBe(true);
    expect(s.cash).toBeLessThan(-500_000_000);
    expect(s.einmalkostenWoche).toBeGreaterThan(0);

    // Kreditversichererlimit und Kassenstand dürfen weder die Liefermenge noch die Zahlung begrenzen.
    s.kvLimitBasis = 0;
    s.vorkasseAkzeptieren = false;
    s.bestellungen.push({ id: 'q13-vorkasse', gruppe: 'damen', wert: 100_000_000, ankunft: 0, vorkasse: false });
    const k = wocheAbspielen(s);
    expect(s.phase).toBe('regulaer');
    expect(s.zahlungsstockungSeit).toBeUndefined();
    expect(k.kapitalfluss).toBeDefined();
    expect(k.kapitalfluss!.investitionen).toBeLessThan(0);
    expect(k.kapitalfluss!.operativ + k.kapitalfluss!.investitionen +
      k.kapitalfluss!.finanzierung + k.kapitalfluss!.sonstiges).toBe(k.kapitalfluss!.netto);
    expect(k.kapitalfluss!.bestand).toBe(s.cash);
    expect(Number.isSafeInteger(k.ebitda)).toBe(true);
  });

  test('52 Wochen mit Schließungen, Investitionen und negativen Beständen ohne Insolvenz oder Wertung', () => {
    const s = neuesSpiel(3, szenarioKonfiguration('sandkasten'));
    s.cash = -2_000_000_000;
    s.kreditlinie = 0;
    s.kapitalflussStartCash = s.cash;
    const premium = s.haeuser.find(h => h.klasse === 'premium' && h.status === 'offen')!;
    expect(fuehreAus(s, { typ: 'premiumInvestition', haus: premium.id, betrag: 100_000_000 }).ok).toBe(true);

    for (let i = 0; i < 52; i++) {
      if (i % 13 === 0) {
        const haus = s.haeuser.find(h => h.status === 'offen' && !h.nurDaten && h.klasse !== 'premium');
        if (haus) expect(fuehreAus(s, { typ: 'schliessen', haus: haus.id }).ok).toBe(true);
      }
      const k = wocheAbspielen(s);
      expect(s.phase).toBe('regulaer');
      expect(s.insolvenz).toBeUndefined();
      expect(s.zahlungsstockungSeit).toBeUndefined();
      expect(k.kapitalfluss).toBeDefined();
      expect(k.kapitalfluss!.bestand).toBe(s.cash);
      expect(k.kapitalfluss!.operativ + k.kapitalfluss!.investitionen +
        k.kapitalfluss!.finanzierung + k.kapitalfluss!.sonstiges).toBe(k.kapitalfluss!.netto);
      expect(Number.isSafeInteger(k.ebitda)).toBe(true);
    }
    expect(s.historie).toHaveLength(52);
    expect(szenarioZiel(s).wertung).toBe(false);
    expect(s.ende).toBeUndefined();
    expect(erfolgeUebersicht(s)).toEqual([]);
    expect(cockpit(s).geldUnbegrenzt).toBe(true);
    expect(s.cash).toBeLessThan(0);

    // Auch über das reguläre Fünfjahresende hinaus keine automatische Endwertung.
    s.woche = 260;
    spielendePruefen(s);
    expect(s.ende).toBeUndefined();
    expect(fuehreAus(s, { typ: 'ruhestand' }).ok).toBe(false);
  });

  test('Außerhalb des Sandkastens bleiben Liquiditätsgrenzen und Wertung aktiv', () => {
    const s = neuesSpiel(1);
    s.cash = -500_000_000;
    s.kreditlinie = 0;
    expect(cockpit(s).geldUnbegrenzt).toBe(false);
    const premium = s.haeuser.find(h => h.klasse === 'premium' && h.status === 'offen')!;
    expect(fuehreAus(s, { typ: 'premiumInvestition', haus: premium.id, betrag: 100_000_000 }).ok).toBe(false);
    expect(szenarioZiel(s).wertung).toBe(true);
  });
});

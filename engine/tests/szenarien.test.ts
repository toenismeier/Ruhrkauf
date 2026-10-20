import { fuehreAus, neuesSpiel, szenarioKonfiguration, szenarioZiel, szenarioName, SZENARIEN, wocheAbspielen } from '../src';
import { szenarioFrequenz, szenarioWoche, unternehmensWert } from '../src/szenarien';
import { eroeffneInsolvenz } from '../src/prozesse';

describe('N09 Szenarien', () => {
  test('sieben eindeutige Karten mit Ziel, Beschreibung und Illustration', () => {
    expect(new Set(SZENARIEN.map((x) => x.id)).size).toBe(7);
    for (const x of SZENARIEN) {
      expect(x.name.length).toBeGreaterThan(5);
      expect(x.ziel.length).toBeGreaterThan(8);
      expect(x.bild.length).toBeGreaterThan(3);
    }
  });

  test('Standard: exakte Werte und RNG-Folge der bisherigen Partie', () => {
    for (const seed of [1, 2, 3]) {
      const bisher = neuesSpiel(seed);
      const ausgewaehlt = neuesSpiel(seed, szenarioKonfiguration('standard'));
      expect(ausgewaehlt).toEqual(bisher);
      expect(ausgewaehlt.szenario).toBeUndefined();
      for (let w = 0; w < 5; w++) {
        expect(wocheAbspielen(ausgewaehlt)).toEqual(wocheAbspielen(bisher));
        expect(ausgewaehlt.rng).toBe(bisher.rng);
      }
    }
  });

  test.each(SZENARIEN.filter((x) => x.id !== 'standard'))('%s: gleicher Seed ergibt denselben Start', (karte) => {
    const cfg = szenarioKonfiguration(karte.id);
    const a = neuesSpiel(12, cfg), b = neuesSpiel(12, cfg);
    expect(a).toEqual(b);
    expect(szenarioName(a)).toBe(karte.name);
  });

  test('Schutzschirm mit zwölf Wochen Gläubigerfrist ab Spielstart', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('schutzschirm'));
    expect(s.phase).toBe('insolvenz');
    expect(s.insolvenz?.seit).toBe(0);
    expect(s.insolvenz?.versammlung).toBe(12);
    expect(szenarioZiel(s).erreicht).toBe(false);
  });

  test('Lockdown: erst Woche acht, genau zehn Wochen minus 70 Prozent und optionales Hilfsangebot', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('lockdown'));
    s.woche = 7;
    expect(szenarioFrequenz(s)).toBe(1);
    szenarioWoche(s);
    expect(s.angebote.some((x) => x.typ === 'staatshilfe')).toBe(false);
    s.woche = 8;
    expect(szenarioFrequenz(s)).toBeCloseTo(0.3);
    szenarioWoche(s);
    const hilfe = s.angebote.find((x) => x.typ === 'staatshilfe')!;
    expect(hilfe.status).toBe('offen');
    expect(hilfe.frist).toBe(12);
    const alt = s.cash;
    expect(fuehreAus(s, { typ: 'angebotAnnehmen', angebot: hilfe.id }).ok).toBe(true);
    expect(s.cash).toBe(alt + hilfe.einmalzahlung!);
    expect(fuehreAus(s, { typ: 'angebotAnnehmen', angebot: hilfe.id }).ok).toBe(false);
    s.woche = 18;
    expect(szenarioFrequenz(s)).toBe(1);
  });

  test('Fusion: 30 echte Zusatzhäuser in 30 verschiedenen Städten', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('fusion'));
    const alt = s.haeuser.filter((x) => x.fusionUrsprung === 'volkskauf');
    expect(alt).toHaveLength(30);
    expect(new Set(alt.map((x) => x.stadt)).size).toBe(30);
    expect(alt.every((x) => x.name.startsWith('Volkskauf'))).toBe(true);
    expect(s.szenario?.fusionHausIds).toEqual(alt.map((x) => x.id));
    expect(s.haeuser).toHaveLength(neuesSpiel(1).haeuser.length + 30);
  });

  test('Investor: Immobilien werden verkauft, Filialbetrieb bleibt bestehen', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('investor'));
    expect(s.szenario?.wertStart).toBeGreaterThan(0);
    expect(Number.isInteger(unternehmensWert(s))).toBe(true);
    const h = s.haeuser.find((x) => x.miete.vermieter === 'eigentuemer')!;
    const miete = h.miete.mieteWoche, cash = s.cash;
    expect(fuehreAus(s, { typ: 'immobilieVerkaufen', haus: h.id }).ok).toBe(true);
    expect(s.cash).toBeGreaterThan(cash);
    expect(h.status).toBe('offen');
    expect(h.miete.vermieter).toBe('dritt');
    expect(h.miete.mieteWoche).toBeGreaterThan(miete);
    expect(s.szenario?.immobilienVerkaeufe).toEqual([0]);
    expect(fuehreAus(s, { typ: 'immobilieVerkaufen', haus: h.id }).ok).toBe(false);
  });

  test('Aufbruch: großer Cashbestand, zusätzliches Wettbewerbsrisiko und Ziel nach drei Jahren', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('aufbruch'));
    expect(s.cash).toBe(900_000_000);
    expect(szenarioFrequenz(s)).toBeLessThan(1);
    expect(s.szenario?.umsatzZiel).toBeGreaterThan(0);
    expect(szenarioZiel(s).text).toContain('Marktführer');
  });

  test('Sandkasten: keine Insolvenz, kein Wertungsziel, wiederauffüllbare Kasse', () => {
    const s = neuesSpiel(1, szenarioKonfiguration('sandkasten'));
    expect(szenarioZiel(s).wertung).toBe(false);
    expect(s.cash).toBeGreaterThan(1e12);
    const vorher = s.cash;
    eroeffneInsolvenz(s, 'Test');
    expect(s.phase).toBe('regulaer');
    expect(fuehreAus(s, { typ: 'insolvenzAntrag' }).ok).toBe(false);
    s.cash = 1;
    szenarioWoche(s);
    expect(s.cash).toBeGreaterThan(vorher - 1);
  });

  test('Sonderaktionen in der Standardpartie gesperrt', () => {
    const s = neuesSpiel(1), haus = s.haeuser[0].id;
    expect(fuehreAus(s, { typ: 'immobilieVerkaufen', haus }).ok).toBe(false);
    expect(szenarioFrequenz(s)).toBe(1);
    expect(s.angebote.some((x) => x.typ === 'staatshilfe')).toBe(false);
  });
});

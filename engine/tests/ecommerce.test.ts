// O09: E-Commerce Baseline, Kanalhebel, Fulfillment, Hauslogistik und Rückgaben.
import { neuesSpiel, wocheAbspielen, fuehreAus, ecommerceUebersicht, ecommerceHaus, ecommerceBruecke } from '../src';
import { ecommerceCluster, retourenQuote } from '../src/ecommerce';
import type { GameState } from '../src';

const spiele = (s: GameState, n: number) => {
  for (let i = 0; i < n && s.phase !== 'zerschlagen'; i++) wocheAbspielen(s);
};

describe('O09 E-Commerce', () => {
  test.each([1, 2, 3])('Startwert bleibt je Seed %i umsatz- und ergebnisneutral', (seed) => {
    const s = neuesSpiel(seed);
    const k = wocheAbspielen(s);
    const o = ecommerceUebersicht(s);
    expect(o.onlineEffekt).toBe(0);
    expect(k.onlineEffekt).toBe(0);
    expect(k.onlineKannibalisierung).toBe(0);
    expect(o.basis).toBe(o.umsatz);
    expect(o.umsatz).toBeGreaterThan(0);
    const warenhausUmsatzJeGruppe = s.haeuser.filter((h) => h.format === 'warenhaus')
      .reduce((a, h) => a + Object.values(h.kpi?.umsatzJeGruppe ?? {})
        .reduce((sum, wert) => sum + (wert ?? 0), 0), 0);
    expect(Math.abs(o.umsatz - 0.08 * warenhausUmsatzJeGruppe)).toBeLessThan(25);
    expect(o.anteil).toBeGreaterThan(0);
    expect(o.anteil).toBeLessThan(0.1);
    expect(k.logistik).toBeGreaterThanOrEqual(0);
    expect(s.ecommerce?.letzte?.kosten).toBe(0);
  });

  test('breiteres Sortiment erzeugt ausgewiesene Kannibalisierung und Nettoumsatz', () => {
    const s = neuesSpiel(1);
    const a = fuehreAus(s, { typ: 'onlineStrategie', sortimentsbreite: 1 });
    expect(a.ok).toBe(true);
    const k = wocheAbspielen(s);
    const o = ecommerceUebersicht(s);
    expect(o.umsatz).toBeGreaterThan(o.basis);
    expect(o.kannibalisierung).toBeGreaterThan(0);
    expect(k.onlineKannibalisierung).toBe(o.kannibalisierung);
    expect(k.onlineEffekt).toBe(o.onlineEffekt);
    expect(ecommerceBruecke(s).titel).toBe('Online');
    expect(ecommerceBruecke(s).umsatzveraenderung).toBe(o.onlineEffekt);
    expect(o.onlineEffekt).toBeGreaterThan(0);
    expect(o.onlineEffekt).toBeLessThan(o.umsatz - o.basis);
  });

  test('Ship-from-Store bindet Logistikstunden und reduziert Altware', () => {
    const standard = neuesSpiel(2);
    const mit = neuesSpiel(2);
    const region = ecommerceCluster(mit.haeuser.find((h) => h.format === 'warenhaus')!);
    for (const s of [standard, mit]) {
      expect(fuehreAus(s, { typ: 'onlineStrategie', sortimentsbreite: 1 }).ok).toBe(true);
    }
    expect(fuehreAus(mit, { typ: 'onlineVersandCluster', cluster: region, an: true }).ok).toBe(true);
    const altwert = (s: GameState) => s.bestand.filter((b) => b.alter >= (b.art === 'nos' ? 52 : 16))
      .reduce((sum, b) => sum + b.wert, 0);
    wocheAbspielen(standard);
    wocheAbspielen(mit);
    const mitVersand = ecommerceUebersicht(mit);
    expect(mitVersand.haeuser.some((h) => h.versand > 0 && h.instoreStunden > 0)).toBe(true);
    expect(altwert(mit)).toBeLessThan(altwert(standard));
  });

  test('Abholstation und Click & Collect erzeugen Abholer, Frequenz und Arbeitsstunden', () => {
    const s = neuesSpiel(3);
    const haus = s.haeuser.find((h) => h.format === 'warenhaus' && h.status === 'offen')!;
    const cash = s.cash;
    expect(fuehreAus(s, { typ: 'onlineAbholstation', haus: haus.id, an: true }).ok).toBe(true);
    expect(s.cash).toBe(cash - 22_000);
    expect(fuehreAus(s, { typ: 'onlineClickCollect', an: true }).ok).toBe(true);
    wocheAbspielen(s);
    const d = ecommerceHaus(s, haus.id)!;
    expect(d.station).toBe(true);
    expect(d.abholungen).toBeGreaterThan(0);
    expect(d.zusaetzlicheKaeufe).toBeGreaterThan(0);
    expect(d.instoreStunden).toBeGreaterThan(0);
  });

  test('Retourenquoten hängen von der Warengruppe ab, Retouren im Haus benötigen Station', () => {
    expect(retourenQuote('damen')).toBeGreaterThan(retourenQuote('beauty'));
    const s = neuesSpiel(2);
    const h = s.haeuser.find((h) => h.format === 'warenhaus')!;
    expect(fuehreAus(s, { typ: 'onlineRetourenHaus', haus: h.id, an: true }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'onlineAbholstation', haus: h.id, an: true }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'onlineRetourenHaus', haus: h.id, an: true }).ok).toBe(true);
    wocheAbspielen(s);
    expect(ecommerceHaus(s, h.id)?.retouren).toBeGreaterThan(0);
  });

  test('Fulfillment-Projekt bucht Investition, braucht Laufzeit und ändert Paketkosten', () => {
    const s = neuesSpiel(1);
    const start = s.cash;
    expect(fuehreAus(s, { typ: 'onlineFulfillment', modell: 'eigen' }).ok).toBe(true);
    expect(s.cash).toBe(start - 4_800_000);
    expect(s.ecommerce?.fulfillment).toBe('dienstleister');
    expect(s.ecommerce?.projekt?.bis).toBe(16);
    // Der Erfolg des Projekts ist unabhängig von einer späteren Unternehmensinsolvenz.
    s.cash = 2_000_000_000;
    spiele(s, 17);
    expect(s.ecommerce?.projekt).toBeUndefined();
    expect(s.ecommerce?.fulfillment).toBe('eigen');
    const u = ecommerceUebersicht(s);
    expect(u.kostenJeBestellung).toBeGreaterThan(0);
    expect(u.bestellungen).toBeGreaterThan(0);
    expect(u.fulfillment).toBe('eigen');
  });

  test.each([1, 2, 3])('52 Wochen gegen Referenz ohne Online-Neukalibrierung (Seed %i)', (seed) => {
    const alt = neuesSpiel(seed), neu = neuesSpiel(seed);
    alt.ecommerceDeaktiviert = true;
    alt.cash = 2_000_000_000;
    neu.cash = 2_000_000_000;
    let umsatzAlt = 0, umsatzNeu = 0, ebitdaAlt = 0, ebitdaNeu = 0;
    for (let w = 0; w < 52; w++) {
      const a = wocheAbspielen(alt);
      const b = wocheAbspielen(neu);
      umsatzAlt += a.umsatz; umsatzNeu += b.umsatz;
      ebitdaAlt += a.ebitda; ebitdaNeu += b.ebitda;
    }
    expect(Math.abs(umsatzNeu - umsatzAlt) / Math.max(1, Math.abs(umsatzAlt))).toBeLessThanOrEqual(0.01);
    expect(Math.abs(ebitdaNeu - ebitdaAlt) / Math.max(1, Math.abs(ebitdaAlt))).toBeLessThanOrEqual(0.01);
  });

  test('Schalter verweigern ungültige Hauscluster und ungültige Parameter', () => {
    const s = neuesSpiel(1);
    expect(fuehreAus(s, { typ: 'onlineVersandCluster', cluster: 'Unbekannt', an: true }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'onlineStrategie', sortimentsbreite: 2 }).ok).toBe(false);
    expect(ecommerceUebersicht(s).sortimentsbreite).toBe(0.65);
  });
});

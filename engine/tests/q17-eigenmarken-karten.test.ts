import { fuehreAus, neuesSpiel, produktAbsatzVerlauf, produktLinienprofil, produkte } from '../src';
import { produktHausFaktor, produktNachfrageFaktor } from '../src/produkte';

describe('Q17: Produktkarten und Linienprofil', () => {
  test('bestehende Produkte behalten standardmäßig einen einheitlichen Preis', () => {
    const s = neuesSpiel(1);
    const p = s.produkte.liste.find((x) => x.status === 'sortiment')!;
    const m = s.eigenmarken.marken.find((x) => x.id === p.marke)!;
    const h = s.haeuser.find((x) => x.status === 'offen')!;
    const f = produktNachfrageFaktor(s, p.marke, p.wg);
    const karte = produkte(s).marken.flatMap((x) => x.produkte).find((x) => x.id === p.id)!;
    expect(karte.preisAlleHaeuser).toBe(true);
    expect(karte.hauspreise).toEqual({});
    expect(produktHausFaktor(s, m, p.wg, h)).toBe(1);
    expect(fuehreAus(s, { typ: 'produktHauspreis', produkt: p.id, haus: h.id, preis: p.preis * 0.8 }).ok).toBe(false);
    expect(produktNachfrageFaktor(s, p.marke, p.wg)).toBe(f);
  });

  test('Filialpreise nur nach Freigabe, nur im gewählten Haus und wieder löschbar', () => {
    const s = neuesSpiel(1);
    const p = s.produkte.liste.find((x) => x.marke === 'em1' && x.status === 'sortiment')!;
    const m = s.eigenmarken.marken.find((x) => x.id === p.marke)!;
    const [h1, h2] = s.haeuser.filter((x) => x.status === 'offen');
    expect(fuehreAus(s, { typ: 'produktPreisAlleHaeuser', produkt: p.id, an: false }).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'produktHauspreis', produkt: p.id, haus: 'unbekannt', preis: 50 }).ok).toBe(false);
    expect(fuehreAus(s, { typ: 'produktHauspreis', produkt: p.id, haus: h1.id, preis: p.preis * 0.8 }).ok).toBe(true);
    expect(produktHausFaktor(s, m, p.wg, h1)).toBeGreaterThan(1);
    expect(produktHausFaktor(s, m, p.wg, h2)).toBe(1);
    expect(produkte(s).marken.flatMap((x) => x.produkte).find((x) => x.id === p.id)!.hauspreise[h1.id]).toBeDefined();
    expect(fuehreAus(s, { typ: 'produktPreisAlleHaeuser', produkt: p.id, an: true }).ok).toBe(true);
    expect(p.hauspreise).toEqual({});
    expect(produktHausFaktor(s, m, p.wg, h1)).toBe(1);
  });

  test('fünf Wochen aus tatsächlich gebuchten Umsätzen, keine erfundenen Startwerte', () => {
    const s = neuesSpiel(1);
    const p = s.produkte.liste.find((x) => x.marke === 'em1' && x.status === 'sortiment')!;
    const anfang = produktAbsatzVerlauf(s, 'em1', p.kategorie);
    expect(anfang.eigen).toEqual([0, 0, 0, 0, 0]);
    expect(anfang.fremd).toEqual([0, 0, 0, 0, 0]);
    p.umsatz = [10, 20, 30, 40, 50];
    s.einkauf.wgs[p.wg].v.u = [100, 100, 100, 100, 100];
    s.einkauf.wgs[p.wg].v.eu = [25, 25, 25, 25, 25];
    const a = produktAbsatzVerlauf(s, p.marke, p.kategorie);
    expect(a.eigen).toEqual([10, 20, 30, 40, 50]);
    expect(a.fremd).toEqual([75, 75, 75, 75, 75]);
    expect(a.letzteEigen).toBe(50);
    expect(a.letzteFremd).toBe(75);
  });

  test('Linienprofil beruht auf Markendaten, Produktpreise ändern den Preispunkt', () => {
    const s = neuesSpiel(1);
    const profil = produktLinienprofil(s, 'em1')!;
    const m = s.eigenmarken.marken.find((x) => x.id === 'em1')!;
    expect(profil.qualitaet).toBe(m.qualitaet * 20);
    expect(profil.modegrad).toBeGreaterThanOrEqual(0);
    expect(profil.nachhaltigkeit).toBeGreaterThanOrEqual(0);
    expect(profil.nachhaltigkeit).toBeLessThanOrEqual(100);
    expect(profil.preispunkt).toBeGreaterThan(0);
    const p = s.produkte.liste.find((x) => x.marke === 'em1' && x.status === 'sortiment')!;
    expect(fuehreAus(s, { typ: 'produktPreis', produkt: p.id, preis: p.preis * 1.2 }).ok).toBe(true);
    expect(produktLinienprofil(s, 'em1')!.preispunkt).toBeGreaterThan(profil.preispunkt);
    expect(produktLinienprofil(s, 'unbekannt')).toBeNull();
  });

  test('Version-2-Spielstände ohne Q17-Felder bleiben kompatibel', () => {
    const s = neuesSpiel(3);
    const p = s.produkte.liste[0];
    delete p.preisAlleHaeuser;
    delete p.hauspreise;
    const k = produkte(s).marken.flatMap((m) => m.produkte).find((x) => x.id === p.id)!;
    expect(k.preisAlleHaeuser).toBe(true);
    expect(k.hauspreise).toEqual({});
  });
});

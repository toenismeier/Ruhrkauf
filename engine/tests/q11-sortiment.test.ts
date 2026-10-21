import { fuehreAus, neuesSpiel, produktKatalog, produktVorschau, produkte } from '../src';
import { ARTIKELTYPEN, produktHausFaktor, produktNachfrageFaktor, produktMargeDelta } from '../src/produkte';
import { PRODUKT_ZIELGRUPPEN, sortimentsBaum } from '../src/produkt-sortiment';

describe('Q11: Eigenmarken und Kategoriebaum Version 2', () => {
  test('alle Artikeltypen genau einmal im aufklappbaren Baum', () => {
    const s = neuesSpiel(1);
    const k = produktKatalog(s);
    expect(k.version).toBe(2);
    const eintraege = k.baum.flatMap((a) => a.unterkategorien.flatMap((u) => u.typen));
    expect(eintraege).toHaveLength(k.typen.length);
    expect(new Set(eintraege).size).toBe(k.typen.length);
    expect(new Set(eintraege)).toEqual(new Set(k.typen.map((t) => t.typ)));
    expect(k.baum.map((a) => a.name)).toEqual(expect.arrayContaining([
      'Oberteile', 'Unterteile', 'Kleider', 'Jacken und Mäntel', 'Accessoires', 'Kinder und Baby',
    ]));
    for (const typ of ['Wickelkleid','A-Linien-Kleid','Tunikabluse','Oversize-Bluse','Feinstrickpullover',
      'Longcardigan','Trenchcoat','Bouclé-Jacke','Top','Crop-Top','Stoffhose','Leinenhose','Cargohose',
      'Minirock','A-Linien-Rock','Plüschtier']) expect(eintraege).toContain(typ);
    const pfad = (t: string) => k.baum.find((a) => a.unterkategorien.some((u) => u.typen.includes(t)))?.id;
    expect(pfad('Wickelkleid')).toBe('kleider');
    expect(pfad('Crop-Top')).toBe('oberteile');
    expect(pfad('Leinenhose')).toBe('unterteile');
    expect(pfad('Plüschtier')).toBe('kinder');
    expect(sortimentsBaum(ARTIKELTYPEN)).toEqual(k.baum);
  });

  test('fünf Zielgruppen mit nachvollziehbarer Preislage und Kosten, Version bleibt 2', () => {
    const s = neuesSpiel(2);
    const k = produktKatalog(s);
    expect(s.version).toBe(2);
    expect(k.zielgruppen.map((z) => z.name)).toEqual([
      'Kinder', 'Teens & Tweens', 'Young Adults', 'Adults', 'Best Ager',
    ]);
    expect(PRODUKT_ZIELGRUPPEN).toHaveLength(5);
    const entwurf = { marke: 'em4', typ: 'Jeans-Shorts' as const, farbe: 'jeansblau' as const,
      material: 'Denim' as const, dauer: 12, budgetWoche: 30_000 };
    const alt = produktVorschau(s, entwurf);
    const kinder = produktVorschau(s, { ...entwurf, zielgruppe: 'kinder' as const });
    const best = produktVorschau(s, { ...entwurf, zielgruppe: 'bestager' as const });
    expect(kinder.normpreis).toBeLessThan(best.normpreis);
    expect(kinder.marge).not.toBe(best.marge);
    expect(alt.ok).toBe(true);
    expect(kinder.ok).toBe(true);
    expect(best.ok).toBe(true);
    expect(produktVorschau(s, { ...entwurf, zielgruppe: 'falsch' as any }).fehler).toMatch(/Zielgruppe/);
  });

  test('alte Eigenmarken, vorhandene Produkte und Version-2-Spielstände bleiben neutral', () => {
    const s = neuesSpiel(1);
    const alt = structuredClone(s);
    expect(alt.version).toBe(2);
    expect(alt.produkte.liste.every((p) => p.zielgruppe === undefined)).toBe(true);
    for (const p of alt.produkte.liste) {
      expect(produktNachfrageFaktor(alt, p.marke, p.wg)).toBe(1);
      expect(produktMargeDelta(alt, p.marke, p.wg)).toBe(0);
    }
    const m = alt.eigenmarken.marken.find((x) => x.id === 'em4')!;
    const p = alt.produkte.liste.find((x) => x.marke === 'em4' && x.status === 'sortiment')!;
    const h = alt.haeuser.find((x) => x.status === 'offen')!;
    expect(produktHausFaktor(alt, m, p.wg, h)).toBe(1);
    expect(produkte(alt).marken).toHaveLength(4);
  });

  test('neu entwickelte Artikel speichern die Zielgruppe und steuern Häuser nach Altersstruktur', () => {
    const s = neuesSpiel(2);
    const entwurf = { marke: 'em4', typ: 'Jeans-Shorts' as const, farbe: 'jeansblau' as const,
      material: 'Denim' as const, dauer: 8, budgetWoche: 20_000, zielgruppe: 'bestager' as const };
    const r = fuehreAus(s, { typ: 'produktEntwickeln', entwurf });
    expect(r.ok).toBe(true);
    const p = s.produkte.liste.at(-1)!;
    expect(p.zielgruppe).toBe('bestager');
    expect(produkte(s).marken.find((m) => m.marke === 'em4')!.produkte.some((x) => x.zielgruppeName === 'Best Ager')).toBe(true);
    // Produktionsfreigabe: bestehende Artikel bleiben ohne Kennzeichnung; neuer Artikel wirkt ab Einführung.
    p.status = 'sortiment';
    const m = s.eigenmarken.marken.find((x) => x.id === p.marke)!;
    const faktoren = s.haeuser.filter((h) => h.status === 'offen').map((h) => produktHausFaktor(s, m, p.wg, h));
    expect(faktoren.some((x) => x !== 1)).toBe(true);
    expect(Math.max(...faktoren) - Math.min(...faktoren)).toBeGreaterThan(0);
  });
});

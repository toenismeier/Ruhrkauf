// Q41: neue Artikeltypen Accessoires, Taschen, Schmuck, Beauty aus dem Referenzsortiment (auftraege/wurf4/daten/q41-typen.csv).
// Prüft je CSV-Zeile: Typ vorhanden, Zielgruppen Teens/Young Adults/Adults wie in der Referenz, Preis am Preismedian,
// Platz im Baum, keine Kinder; Haken bildOffen (auftraege/wurf4/bilder-neu.md): vorhandene Silhouette, nicht entwickelbar, nicht im Grundsortiment.
import { readFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, produktKatalog, produkte, wocheAbspielen } from '../src';
import { ARTIKELTYPEN, produktAktion, waehlbar } from '../src/produkte';
import { NAMEN, TYPEN, ANLASS_ZUBEHOER } from '../src/sortiment/q41-accessoires';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, { model: string | null }>;
const zeilen = readFileSync(join(__dirname, '../../auftraege/wurf4/daten/q41-typen.csv'), 'utf8').trim().split('\n').slice(1)
  .map((l) => l.split(';')).map(([typ, oberbegriff, , zielgruppen, , , , median]) => ({ typ, oberbegriff, zielgruppen: zielgruppen.split(','), median: Number(median) }));
const s = neuesSpiel(1);
const K = produktKatalog(s);

describe('Q41: Accessoires, Taschen, Schmuck, Beauty aus dem Referenzsortiment', () => {
  test('alle 50 Typen der CSV in derselben Reihenfolge, Namen eindeutig', () => {
    expect(zeilen).toHaveLength(50);
    expect([...NAMEN]).toEqual(zeilen.map((z) => z.typ));
    expect(TYPEN.map((t) => t.typ)).toEqual([...NAMEN]);
    const alle = ARTIKELTYPEN.map((t) => t.typ);
    expect(new Set(alle).size).toBe(alle.length);
  });

  test('Zielgruppen Teens, Young Adults, Adults wie in der Referenz (ab 30 % der Artikel)', () => {
    const map = { 'Teens': 'teens', 'Young Adults': 'young', 'Adults': 'adults' } as const;
    for (const z of zeilen) {
      const t = K.typen.find((x) => x.typ === z.typ)!;
      for (const [csv, id] of Object.entries(map)) expect([z.typ, csv, t.zielgruppen.includes(id)]).toEqual([z.typ, csv, z.zielgruppen.includes(csv)]);
      expect(t.zielgruppen).not.toContain('kinder');
      expect(t.gruppe.kinder).toBe(0);
    }
  });

  test('Preis (mitte) am Preismedian, Warenhaus-Niveau höchstens 35 % darüber', () => {
    for (const z of zeilen) {
      const t = TYPEN.find((x) => x.typ === z.typ)!;
      expect(t.preis).toBeGreaterThanOrEqual(Math.floor(z.median));
      expect(t.preis).toBeLessThanOrEqual(z.median * 1.35);
    }
  });

  test('bildOffen mit vorhandener Silhouette (keine q41-Bilder), Kategorie und Baumplatz passend zum Oberbegriff, Taschen und Kopfbedeckungen mit Model-Platz', () => {
    for (const z of zeilen) {
      const t = TYPEN.find((x) => x.typ === z.typ)!;
      expect(t.bildOffen).toBe(true);
      expect(t.bild.silhouette).not.toMatch(/^q41_/);
      expect(SILH[t.bild.silhouette]).toBeDefined();
      expect(t.kategorie).toBe(z.oberbegriff === 'Beauty' ? 'beauty' : 'accessoires');
      if (z.oberbegriff === 'Tasche') { expect(t.pfad).toEqual(['accessoires', 'Taschen']); expect(SILH[t.bild.silhouette].model).toBe('tasche'); }
      if (z.oberbegriff === 'Schmuck') expect(t.pfad).toEqual(['accessoires', 'Schmuck']);
      if (/Cap|mütze|Balaclava/.test(z.typ)) expect(SILH[t.bild.silhouette].model).toBe('muetze');
    }
    const baum = K.baum.find((a) => a.id === 'accessoires')!.unterkategorien.flatMap((u) => u.typen);
    for (const z of zeilen.filter((x) => x.oberbegriff !== 'Beauty')) expect(baum).toContain(z.typ);
  });

  test('Q37: Anlass Zubehör laut Referenz, Muster frei vom Typnamen, Muster des Typs im Katalog', () => {
    const zub = K.baum.find((a) => a.id === 'anlass')?.unterkategorien.find((u) => /Zubehör/.test(u.name))?.typen ?? [];
    for (const typ of ANLASS_ZUBEHOER) expect(zub).toContain(typ);
    for (const typ of NAMEN) expect(typ).not.toMatch(/Karo|Streifen|Ringel|Punkte|Blumen|Leo|Camouflage|Batik|Print/);
    expect(K.typen.find((t) => t.typ === 'Military-Cap')!.muster).toEqual(['Uni', 'Camouflage']);
  });

  test('bildOffen: hinten angehängt, in keiner Marke entwickelbar, Entwickeln wird abgelehnt', () => {
    expect(ARTIKELTYPEN.slice(-TYPEN.length).map((t) => t.typ)).toEqual([...NAMEN]);
    const s2 = neuesSpiel(1);
    const offen = new Set<string>(NAMEN);
    for (const t of ARTIKELTYPEN.filter((x) => offen.has(x.typ))) expect(waehlbar(t)).toBe(false);
    for (const m of produkte(s2).marken) expect(m.entwickelbar.filter((t) => offen.has(t))).toEqual([]);
    const m = produkte(s2).marken[0];
    const r = produktAktion(s2, { typ: 'produktEntwickeln', entwurf: { marke: m.marke, typ: 'Bowlingtasche', farbe: 'schwarz', material: 'Polyester', dauer: 12, budgetWoche: 20_000 } });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/noch nicht freigegeben/);
  });

  test('bildOffen: nicht im Grundsortiment, auch nicht nach 8 Wochen', () => {
    const s2 = neuesSpiel(2);
    const offen = new Set<string>(NAMEN);
    expect(s2.produkte.liste.filter((p) => offen.has(p.typ))).toEqual([]);
    for (let i = 0; i < 8; i++) wocheAbspielen(s2);
    expect(s2.produkte.liste.filter((p) => offen.has(p.typ))).toEqual([]);
  });
});

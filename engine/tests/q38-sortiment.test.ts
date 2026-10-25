// Q38: neue Oberteile aus dem Referenzsortiment (auftraege/wurf4/daten/q38-typen.csv).
// Prüft: jeder Typ der CSV ist da (Baby-Tee als Babytee schon vorhanden), Zielgruppen wie in der Referenz, Preis am Preismedian,
// eigenes Bild aus der Bibliothek, Platz im Baum, Startsortiment unverändert.
import { readFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, produktKatalog } from '../src';
import { ARTIKELTYPEN, SORTIMENT_TYPEN } from '../src/produkte';
import { NAMEN as Q38_NAMEN } from '../src/sortiment/q38-oberteile';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, unknown>;
const CSV = readFileSync(join(__dirname, '../../auftraege/wurf4/daten/q38-typen.csv'), 'utf8').trim().split('\n').slice(1).map((z) => {
  const s = z.split(';');
  return { typ: s[0], zielgruppen: s[3].split(','), preis: Number(s[7]) };
});
const VORHANDEN: Record<string, string> = { 'Baby-Tee': 'Babytee', Strickpullover: 'Strickpullover' };
const ZG: Record<string, string> = { Teens: 'teens', 'Young Adults': 'young', Adults: 'adults' };
const K = produktKatalog(neuesSpiel(1));

describe('Q38 Oberteile aus dem Referenzsortiment', () => {
  test('alle Typen der Referenz sind im Katalog, keine Dubletten', () => {
    const namen = new Set(K.typen.map((t) => t.typ));
    for (const z of CSV) expect(namen.has(VORHANDEN[z.typ] ?? z.typ)).toBe(true);
    expect(Q38_NAMEN.length).toBe(CSV.length - Object.keys(VORHANDEN).length);
    expect(new Set(ARTIKELTYPEN.map((t) => t.typ)).size).toBe(ARTIKELTYPEN.length);
  });

  test('Zielgruppen wie in der Referenz (Teens, Young Adults, Adults; nie Kinder oder Best Ager)', () => {
    for (const z of CSV) {
      const t = K.typen.find((x) => x.typ === (VORHANDEN[z.typ] ?? z.typ))!;
      const soll = z.zielgruppen.map((g) => ZG[g]).sort();
      if (VORHANDEN[z.typ]) { for (const g of soll) expect([z.typ, t.zielgruppen]).toEqual([z.typ, expect.arrayContaining([g])]); continue; }
      expect([z.typ, [...t.zielgruppen].sort()]).toEqual([z.typ, soll]);
    }
  });

  test('Preis am Preismedian der Referenz (Warenhaus darf bis 30 % darüber liegen)', () => {
    for (const z of CSV.filter((x) => !VORHANDEN[x.typ])) {
      const t = ARTIKELTYPEN.find((x) => x.typ === z.typ)!;
      expect(t.preis).toBeGreaterThanOrEqual(Math.floor(z.preis));
      expect(t.preis).toBeLessThanOrEqual(Math.ceil(z.preis * 1.3));
    }
  });

  test('eigene Silhouette, Platz unter Oberteile/Jacken, hinten angehängt', () => {
    const neu = SORTIMENT_TYPEN.filter((t) => Q38_NAMEN.includes(t.typ));
    expect(neu.length).toBe(Q38_NAMEN.length);
    expect(new Set(neu.map((t) => t.bild.silhouette)).size).toBe(neu.length);
    for (const t of neu) {
      expect(t.bild.silhouette).toMatch(/^q38_/);
      expect(SILH[t.bild.silhouette]).toBeDefined();
      expect(['oberteile', 'jacken']).toContain(t.pfad![0]);
    }
    const idx = ARTIKELTYPEN.findIndex((t) => t.typ === Q38_NAMEN[0]);
    expect(ARTIKELTYPEN.slice(idx).map((t) => t.typ)).toEqual([...Q38_NAMEN]);
  });

  test('Sortimentsbaum zeigt die neuen Oberteile unter ihrem Ast', () => {
    const typen = (k: string, u: string) => K.baum.find((a) => a.id === k)!.unterkategorien.find((x) => x.name === u)!.typen;
    expect(typen('oberteile', 'Tops')).toEqual(expect.arrayContaining(['Body', 'Tanktop', 'Bustier-Top']));
    expect(typen('oberteile', 'Strick')).toEqual(expect.arrayContaining(['Netzstrickpullover', 'V-Pullover']));
    expect(typen('jacken', 'Westen')).toEqual(expect.arrayContaining(['Jeansweste', 'Weste', 'Kunstfellweste']));
  });
});

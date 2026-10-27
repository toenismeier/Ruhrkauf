// Q40: Jacken, Schuhe, Wäsche aus dem Referenzsortiment (auftraege/wurf4/daten/q40-typen.csv).
// Prüft: jeder Typ der CSV ist da, Zielgruppen wie in der Referenz, Preis am Preismedian, Platz im Baum (Wäsche unter
// „Wäsche und Nachtwäsche“), Anlass-Typen zusätzlich im Ast Anlass; bildOffen (auftraege/wurf4/bilder-neu.md, Abschnitt 1):
// vorhandene Silhouette, nicht entwickelbar, nicht im Grundsortiment.
import { readFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, produktKatalog, produkte, wocheAbspielen } from '../src';
import { ARTIKELTYPEN, SORTIMENT_TYPEN, waehlbar } from '../src/produkte';
import { NAMEN as Q40_NAMEN } from '../src/sortiment/q40-jacken-schuhe-waesche';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, { nur?: string }>;
const CSV = readFileSync(join(__dirname, '../../auftraege/wurf4/daten/q40-typen.csv'), 'utf8').trim().split('\n').slice(1).map((z) => {
  const s = z.split(';');
  return { typ: s[0], oberbegriff: s[1], zielgruppen: s[3].split(','), preis: Number(s[7]) };
});
const ZG: Record<string, string> = { Teens: 'teens', 'Young Adults': 'young', Adults: 'adults' };
const K = produktKatalog(neuesSpiel(1));
const typ = (n: string) => K.typen.find((t) => t.typ === n)!;

describe('Q40 Jacken, Schuhe, Wäsche aus dem Referenzsortiment', () => {
  test('alle 45 Typen der Referenz sind im Katalog, keine Dubletten', () => {
    expect(new Set(Q40_NAMEN)).toEqual(new Set(CSV.map((z) => z.typ)));
    expect(Q40_NAMEN.length).toBe(45);
    expect(new Set(ARTIKELTYPEN.map((t) => t.typ)).size).toBe(ARTIKELTYPEN.length);
  });

  test('Zielgruppen wie in der Referenz (Teens, Young Adults, Adults; nie Kinder oder Best Ager)', () => {
    for (const z of CSV) expect([z.typ, [...typ(z.typ).zielgruppen].sort()]).toEqual([z.typ, z.zielgruppen.map((g) => ZG[g.trim()]).sort()]);
  });

  test('Preis am Preismedian der Referenz (Warenhaus darf bis 30 % darüber liegen)', () => {
    for (const z of CSV) {
      const t = ARTIKELTYPEN.find((x) => x.typ === z.typ)!;
      expect([z.typ, t.preis >= Math.floor(z.preis) && t.preis <= Math.ceil(z.preis * 1.3)]).toEqual([z.typ, true]);
    }
  });

  test('bildOffen: vorhandene Silhouette (keine q40-Bilder, keine Kinderbindung), hinten angehängt', () => {
    const neu = SORTIMENT_TYPEN.filter((t) => (Q40_NAMEN as readonly string[]).includes(t.typ));
    expect(neu.length).toBe(Q40_NAMEN.length);
    for (const t of neu) {
      expect(t.bildOffen).toBe(true);
      expect(t.bild.silhouette).not.toMatch(/^q40_|^b\d\d/);
      expect(SILH[t.bild.silhouette]).toBeDefined();
      expect([t.typ, SILH[t.bild.silhouette].nur]).not.toEqual([t.typ, 'kinder']);
    }
    const idx = ARTIKELTYPEN.findIndex((t) => t.typ === Q40_NAMEN[0]);
    expect(new Set(ARTIKELTYPEN.slice(idx, idx + Q40_NAMEN.length).map((t) => t.typ))).toEqual(new Set(Q40_NAMEN));
    expect(K.typen.filter((t) => t.bildOffen).map((t) => t.typ)).toEqual(expect.arrayContaining([...Q40_NAMEN]));
  });

  test('bildOffen: in keiner Marke entwickelbar, nicht im Grundsortiment, auch nicht nach 8 Wochen', () => {
    const s = neuesSpiel(2);
    const q40 = new Set<string>(Q40_NAMEN);
    for (const t of ARTIKELTYPEN.filter((x) => q40.has(x.typ))) expect(waehlbar(t)).toBe(false);
    for (const m of produkte(s).marken) expect(m.entwickelbar.filter((t) => q40.has(t))).toEqual([]);
    expect(s.produkte.liste.filter((p) => q40.has(p.typ))).toEqual([]);
    for (let i = 0; i < 8; i++) wocheAbspielen(s);
    expect(s.produkte.liste.filter((p) => q40.has(p.typ))).toEqual([]);
  });

  test('Baum: Wäsche unter „Wäsche und Nachtwäsche“, Jacken und Schuhe an ihrem Ast, Anlass-Typen zusätzlich unter Anlass', () => {
    const ast = { Wäsche: 'waesche', Socken: 'waesche', Jacke: 'jacken', Mantel: 'jacken', Blazer: 'jacken', Schuh: 'schuhe' } as Record<string, string>;
    const imAst = (id: string) => new Set(K.baum.find((a) => a.id === id)!.unterkategorien.flatMap((u) => u.typen));
    for (const z of CSV) expect([z.typ, imAst(ast[z.oberbegriff]).has(z.typ)]).toEqual([z.typ, true]);
    expect(K.baum.find((a) => a.id === 'waesche')!.name).toBe('Wäsche und Nachtwäsche');
    expect(typ('Sakko').anlass).toEqual(expect.arrayContaining(['abiball', 'tanzschulball', 'konfirmation', 'feier']));
    expect(typ('Sandalette').anlass).toEqual(expect.arrayContaining(['abiball', 'tanzschulball', 'feier']));
    expect(typ('Sock-Boot').anlass).toEqual(expect.arrayContaining(['abiball', 'tanzschulball', 'feier']));
    expect(typ('Klebe-BH').anlass).toEqual(['zubehoer']);
    const anlassAst = K.baum.find((a) => a.id === ('anlass' as string));
    if (anlassAst) for (const n of ['Sakko', 'Sandalette', 'Sock-Boot', 'Klebe-BH']) expect([n, anlassAst.unterkategorien.some((u) => u.typen.includes(n))]).toEqual([n, true]);
  });
});

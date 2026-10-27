// Q39: neue Unterteile, Kleider, Jumpsuits und Bademode aus dem Referenzsortiment (auftraege/wurf4/daten/q39-typen.csv).
// Prüft: jeder Typ der CSV ist da (Faltenrock, Midirock kommen aus Q37), Zielgruppen wie in der Referenz, Preis am Preismedian,
// Platz im Baum, Ast Anlass; Haken bildOffen (auftraege/wurf4/bilder-neu.md): vorhandene Silhouette, nicht entwickelbar,
// nicht im Grundsortiment.
import { readFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, produktKatalog, produkte, wocheAbspielen } from '../src';
import { ARTIKELTYPEN, SORTIMENT_TYPEN, produktAktion, waehlbar } from '../src/produkte';
import { BILD_WURF4, BILD_REST } from '../src/sortiment/bilder-wurf4';
import { NAMEN, ZIEL, VON_Q37 } from '../src/sortiment/q39-unterteile';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, { nur?: string }>;
const CSV = readFileSync(join(__dirname, '../../auftraege/wurf4/daten/q39-typen.csv'), 'utf8').trim().split('\n').slice(1).map((z) => {
  const s = z.split(';');
  return { typ: s[0], zielgruppen: s[3].split(','), preis: Number(s[7]) };
});
const ZG: Record<string, string> = { Teens: 'teens', 'Young Adults': 'young', Adults: 'adults' };
const vonQ37 = (typ: string) => (VON_Q37 as readonly string[]).includes(typ);
const K = produktKatalog(neuesSpiel(1));

describe('Q39 Unterteile und Kleider aus dem Referenzsortiment', () => {
  test('alle 50 Typen der Referenz im Katalog (48 neu, 2 aus Q37), keine Dubletten', () => {
    expect(CSV).toHaveLength(50);
    expect([...NAMEN, ...VON_Q37].sort()).toEqual(CSV.map((c) => c.typ).sort());
    const namen = new Set(K.typen.map((t) => t.typ));
    for (const z of CSV) expect(namen.has(z.typ)).toBe(true);
    expect(new Set(ARTIKELTYPEN.map((t) => t.typ)).size).toBe(ARTIKELTYPEN.length);
  });

  test('Zielgruppen wie in der Referenz (Teens, Young Adults, Adults; nie Kinder oder Best Ager)', () => {
    for (const z of CSV) {
      const t = K.typen.find((x) => x.typ === z.typ)!;
      const soll = z.zielgruppen.map((g) => ZG[g]).sort();
      if (vonQ37(z.typ)) { for (const g of soll) expect([z.typ, t.zielgruppen]).toEqual([z.typ, expect.arrayContaining([g])]); continue; }
      expect([z.typ, [...t.zielgruppen].sort()]).toEqual([z.typ, soll]);
      expect(ZIEL[z.typ]).toBe(z.zielgruppen.includes('Adults') ? 'TYA' : 'TY');
    }
  });

  test('Preis am Preismedian der Referenz (Warenhaus bis 25 % darüber, höchstens 10 % darunter)', () => {
    for (const z of CSV.filter((x) => !vonQ37(x.typ))) {
      const t = ARTIKELTYPEN.find((x) => x.typ === z.typ)!;
      expect([z.typ, t.preis >= z.preis * 0.9 && t.preis <= z.preis * 1.25]).toEqual([z.typ, true]);
    }
  });

  test('Bild aus Bildpaket (Rest bildOffen) ohne Kinder-/Herren-Bindung, keine q39-Bilder, hinten angehängt', () => {
    const neu = SORTIMENT_TYPEN.filter((t) => NAMEN.includes(t.typ));
    expect(neu.length).toBe(NAMEN.length);
    for (const t of neu) {
      // Bildpakete Wurf 4: eigene Silhouette aus dem Paket, nur die Rest-Typen bleiben bildOffen mit Platzhalter
      if (BILD_REST.has(t.typ)) { expect(t.bildOffen).toBe(true); expect(t.bild.silhouette).not.toMatch(/^b\d\d/); }
      else { expect(t.bildOffen).toBeUndefined(); expect(t.bild.silhouette).toBe(BILD_WURF4[t.typ]); }
      expect(t.bild.silhouette).not.toMatch(/^q39_/);
      expect(SILH[t.bild.silhouette]).toBeDefined();
      expect(['kinder', 'herren']).not.toContain(SILH[t.bild.silhouette].nur);
      expect(['unterteile', 'kleider', 'waesche']).toContain(t.pfad![0]);
    }
    const idx = ARTIKELTYPEN.findIndex((t) => t.typ === NAMEN[0]);
    expect(ARTIKELTYPEN.slice(idx).map((t) => t.typ)).toEqual([...NAMEN]);
    expect(K.typen.filter((t) => t.bildOffen && NAMEN.includes(t.typ)).map((t) => t.typ).sort()).toEqual(NAMEN.filter((n) => BILD_REST.has(n)).sort());
  });

  test('bildOffen: in keiner Marke entwickelbar, Entwickeln wird abgelehnt', () => {
    const s = neuesSpiel(1);
    const offen = new Set(NAMEN.filter((n) => BILD_REST.has(n)));
    for (const m of produkte(s).marken) expect(m.entwickelbar.filter((t) => offen.has(t))).toEqual([]);
    expect(ARTIKELTYPEN.filter((t) => offen.has(t.typ)).every((t) => !waehlbar(t))).toBe(true);
    const m = produkte(s).marken[0];
    const r = produktAktion(s, { typ: 'produktEntwickeln', entwurf: { marke: m.marke, typ: 'Baggy-Hose', farbe: 'schwarz', material: 'Denim', dauer: 12, budgetWoche: 20_000 } });
    expect(r.ok).toBe(false);
    expect(r.text).toMatch(/noch nicht freigegeben/);
  });

  test('bildOffen: nicht im Grundsortiment, auch nicht nach 8 Wochen', () => {
    const s = neuesSpiel(2);
    const offen = new Set(NAMEN.filter((n) => BILD_REST.has(n)));
    expect(s.produkte.liste.filter((p) => offen.has(p.typ))).toEqual([]);
    for (let i = 0; i < 8; i++) wocheAbspielen(s);
    expect(s.produkte.liste.filter((p) => offen.has(p.typ))).toEqual([]);
  });

  test('Sortimentsbaum: Stammplatz und Ast Anlass', () => {
    const ast = (k: string) => new Set(K.baum.find((a) => a.id === k)!.unterkategorien.flatMap((u) => u.typen));
    for (const typ of ['Barrel-Jeans', 'Low-Rise-Jeans', 'Pumphose', 'Hotpants', 'Maxirock']) expect([typ, ast('unterteile').has(typ)]).toEqual([typ, true]);
    for (const typ of ['Neckholderkleid', 'Playsuit', 'Dirndl']) expect([typ, ast('kleider').has(typ)]).toEqual([typ, true]);
    for (const typ of ['Cocktailkleid', 'Dirndl', 'Neckholderkleid', 'Paillettenkleid', 'Qipao']) expect([typ, ast('anlass').has(typ)]).toEqual([typ, true]);
  });
});

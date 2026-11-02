// Q42: seltene Typen und Schnittvarianten aus dem Referenzsortiment (auftraege/wurf4/daten/q42-typen.csv, q42-varianten.csv).
// Prüft jede Zeile beider CSVs: Typ vorhanden mit Zielgruppen wie in der Referenz, Preis am Preismedian, Platz im Baum,
// Bild = Silhouette aus den Paketen B22 bis B30 (Korsagenbluse, Tabi-Sneaker: bildOffen); Variante am Zieltyp im Produktentwickler
// wählbar (Vorschau und Entwicklung), Zielgruppe der Variante nur für die Variante; die 13 Typen unter „Draußen“ fehlen.
import { readFileSync } from 'fs';
import { join } from 'path';
import { fuehreAus, neuesSpiel, produktKatalog, produkte, wocheAbspielen } from '../src';
import { ARTIKELTYPEN, SORTIMENT_TYPEN, bewerte, produktAktion, produktVorschau, waehlbar, type ProduktEntwurf } from '../src/produkte';
import { BILD_WURF4, BILD_REST } from '../src/sortiment/bilder-wurf4';
import { NAMEN } from '../src/sortiment/q42-selten';
import { VARIANTEN } from '../src/sortiment/q42-varianten';
import type { GameState } from '../src/types';

const daten = (n: string) => readFileSync(join(__dirname, '../../auftraege/wurf4/daten', n), 'utf8').replace(/^﻿/, '');
/** CSV mit Semikolon, Felder teils in Anführungszeichen. */
function csv(text: string): Record<string, string>[] {
  const zeilen = text.trim().split('\n').map((l) => { const r: string[] = []; let f = '', q = false; for (const c of l) { if (c === '"') { q = !q; continue; } if (c === ';' && !q) { r.push(f); f = ''; continue; } f += c; } r.push(f); return r; });
  return zeilen.slice(1).map((z) => Object.fromEntries(zeilen[0].map((k, i) => [k, z[i]])));
}
const TYPEN_CSV = csv(daten('q42-typen.csv'));
const VAR_CSV = csv(daten('q42-varianten.csv'));
const ZG: Record<string, string> = { Teens: 'teens', 'Young Adults': 'young', Adults: 'adults' };
const zg = (x: string) => x.split(',').map((g) => ZG[g.trim()]).sort();

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, unknown>;
const PAKET: Record<string, string> = {};
for (let i = 22; i <= 30; i++) {
  const j = JSON.parse(readFileSync(join(__dirname, `../../render/src/kit/mode/b${i}-zuordnung.json`), 'utf8')).typen as Record<string, string | { silhouette: string }>;
  for (const [typ, v] of Object.entries(j)) PAKET[typ] = typeof v === 'string' ? v : v.silhouette;
}
const REST = ['Korsagenbluse', 'Tabi-Sneaker'];
const DRAUSSEN = ['Anstecker-Set', 'Fashion-Tape', 'Handyhalter', 'Hunde-Hoodie', 'Schmuckbox', 'Shirt-Set', 'Besteck-Rolltasche', 'Glätteisen-Etui',
  'Brust-Tape', 'Nipple-Cover', 'Geschenkgutschein', 'Kleiderschutzhülle', 'Spezialwaschmittel'];
const AST: Record<string, string> = { Accessoire: 'accessoires', Tasche: 'accessoires', Schmuck: 'accessoires', Bademode: 'waesche', Wäsche: 'waesche', Socken: 'waesche',
  Beauty: 'beauty', Blazer: 'jacken', Jacke: 'jacken', Mantel: 'jacken', Weste: 'jacken', Bluse: 'oberteile', Hemd: 'oberteile', Cardigan: 'oberteile', Hoodie: 'oberteile',
  Pullover: 'oberteile', Shirt: 'oberteile', Hose: 'unterteile', Jeans: 'unterteile', Rock: 'unterteile', Shorts: 'unterteile', Jumpsuit: 'kleider', Kleid: 'kleider', Schuh: 'schuhe' };
/** Abweichung vom Oberbegriff: Pyjamashorts (Oberbegriff Shorts) gehören in die Nachtwäsche. */
const AST_TYP: Record<string, string> = { Pyjamashorts: 'waesche' };
const ANLASS: Record<string, string[]> = {
  Ballkleid: ['abiball', 'tanzschulball'], Brautkleid: ['braut'], Corsagenkleid: ['konfirmation', 'feier'], Blazerkleid: ['tanzschulball', 'konfirmation'],
  'Plateau-Pumps': ['abiball', 'tanzschulball', 'feier'], 'Plateau-Sandalette': ['abiball', 'tanzschulball', 'feier'],
  Trachtenjacke: ['tracht'], Trachtenhemd: ['tracht'], Trachtenlederhose: ['tracht'],
  'Pillbox-Hut': ['zubehoer'], Kopfschmuck: ['zubehoer'], 'Lange Handschuhe': ['zubehoer'], Muscheltasche: ['zubehoer'],
};

const K = produktKatalog(neuesSpiel(1));
const typ = (n: string) => K.typen.find((t) => t.typ === n)!;

/** Eine Marke, die den Zieltyp in der Variante entwickeln kann: erst die Startmarken, sonst eine neue Young-Adults-Marke. */
function markeFuer(s: GameState, e: Omit<ProduktEntwurf, 'marke'>): string {
  for (const m of s.eigenmarken.marken) if (produktVorschau(s, { ...e, marke: m.id }).ok) return m.id;
  const t = typ(e.typ);
  const kategorie = ({ schuhe: 'Schuhe', waesche: 'Wäsche', accessoires: 'Accessoires', beauty: 'Beauty' } as const)[t.kategorie as 'schuhe'] ?? 'Bekleidung';
  const wgs = [...t.wgs, ...(t.varianten.find((v) => v.name === e.variante)?.wgs ?? [])].filter((w) => !/^kinder/.test(w));
  const texte: string[] = [];
  for (const wg of wgs) for (const geschlecht of ['unisex', 'damen', 'herren'] as const) {
    const r = fuehreAus(s, { typ: 'eigenmarkeGruenden', entwurf: { name: `Test ${e.variante} ${geschlecht}`, zielgruppe: { alter: '18-29', geschlecht }, kategorie, preislage: 'mitte',
      stil: 'trendig', qualitaet: 3, beschaffung: 'nahost', budgetWoche: 0, wgAnteile: { [wg]: 0.3 } } });
    if (r.ok) return s.eigenmarken.marken[s.eigenmarken.marken.length - 1].id;
    texte.push(r.text);
  }
  throw new Error(`${e.variante}: keine Marke gründbar (${texte.join(' | ')})`);
}

describe('Q42: seltene Typen aus dem Referenzsortiment', () => {
  test('83 Typen der CSV in derselben Reihenfolge, keine Dubletten, „Draußen“ nicht angelegt', () => {
    expect(TYPEN_CSV).toHaveLength(83);
    expect([...NAMEN]).toEqual(TYPEN_CSV.map((z) => z.grundtyp));
    const alle = ARTIKELTYPEN.map((t) => t.typ);
    expect(new Set(alle).size).toBe(alle.length);
    for (const n of DRAUSSEN) expect([n, alle.includes(n)]).toEqual([n, false]);
    const idx = ARTIKELTYPEN.findIndex((t) => t.typ === NAMEN[0]);
    expect(ARTIKELTYPEN.slice(idx, idx + NAMEN.length).map((t) => t.typ)).toEqual([...NAMEN]);
  });

  test.each(TYPEN_CSV.map((z) => [z.grundtyp, z] as const))('%s: Zielgruppen, Preis, Baum, Bild, Anlass', (n, z) => {
    const t = typ(n);
    expect(t).toBeDefined();
    // Zielgruppen exakt wie in der Referenz, nie Kinder oder Best Ager
    expect([...t.zielgruppen].sort()).toEqual(zg(z.zielgruppen));
    // Preis (mitte) am Preismedian, Warenhaus-Eigenmarke höchstens 15 % darüber
    const median = Number(z.preis_median_eur);
    expect(t.preisMitte).toBeGreaterThanOrEqual(Math.floor(median));
    expect(t.preisMitte).toBeLessThanOrEqual(Math.ceil(median * 1.15));
    // Platz im Baum am Ast des Oberbegriffs
    expect(K.baum.find((a) => a.id === (AST_TYP[n] ?? AST[z.oberbegriff]))!.unterkategorien.some((u) => u.typen.includes(n))).toBe(true);
    // Bild: Silhouette aus dem Paket; die zwei Rest-Typen bildOffen mit vorhandener Ersatz-Silhouette
    const roh = SORTIMENT_TYPEN.find((x) => x.typ === n)!;
    expect(PAKET[n]).toBeDefined();
    expect(BILD_WURF4[n]).toBe(PAKET[n]);
    expect(SILH[PAKET[n]]).toBeDefined();
    if (REST.includes(n)) {
      expect(BILD_REST.has(n)).toBe(true);
      expect(roh.bildOffen).toBe(true);
      expect(t.bildOffen).toBe(true);
      expect(roh.bild.silhouette).not.toMatch(/^b\d\d/);
      expect(SILH[roh.bild.silhouette]).toBeDefined();
      expect(waehlbar(roh)).toBe(false);
    } else {
      expect(roh.bildOffen).toBeUndefined();
      expect(roh.bild.silhouette).toBe(PAKET[n]);
      expect(waehlbar(roh)).toBe(true);
    }
    // Anlass-Typen zusätzlich im Ast Anlass
    expect([...t.anlass].sort()).toEqual([...(ANLASS[n] ?? [])].sort());
    const anlassAst = K.baum.find((a) => a.id === 'anlass')!;
    expect(anlassAst.unterkategorien.some((u) => u.typen.includes(n))).toBe(!!ANLASS[n]);
  });

  test('Ast Anlass hat die Unterkategorien Hochzeit (Braut) und Volksfest und Tracht mit den Q42-Typen', () => {
    const u = (name: string) => K.baum.find((a) => a.id === 'anlass')!.unterkategorien.find((x) => x.name === name)!;
    expect(u('Hochzeit (Braut)').typen).toContain('Brautkleid');
    expect(u('Volksfest und Tracht').typen).toEqual(expect.arrayContaining(['Trachtenjacke', 'Trachtenhemd', 'Trachtenlederhose']));
    expect(u('Abiball').typen).toEqual(expect.arrayContaining(['Ballkleid', 'Plateau-Pumps', 'Plateau-Sandalette']));
    expect(u('Zubehör').typen).toEqual(expect.arrayContaining(['Pillbox-Hut', 'Kopfschmuck', 'Lange Handschuhe', 'Muscheltasche']));
  });

  test('nicht im Grundsortiment, auch nicht nach 8 Wochen; Rest-Typen in keiner Marke entwickelbar', () => {
    const s = neuesSpiel(2);
    const q42 = new Set<string>(NAMEN);
    expect(s.produkte.liste.filter((p) => q42.has(p.typ))).toEqual([]);
    for (let i = 0; i < 8; i++) wocheAbspielen(s);
    expect(s.produkte.liste.filter((p) => q42.has(p.typ))).toEqual([]);
    for (const m of produkte(s).marken) expect(m.entwickelbar.filter((t) => REST.includes(t))).toEqual([]);
  });
});

describe('Q42: Schnittvarianten am Zieltyp', () => {
  test('35 Varianten der CSV, keine davon als eigener Artikeltyp', () => {
    expect(VAR_CSV).toHaveLength(35);
    expect(VARIANTEN.map((v) => [v.name, v.zieltyp])).toEqual(VAR_CSV.map((z) => [z.variante, z.zieltyp]));
    for (const z of VAR_CSV) expect([z.variante, ARTIKELTYPEN.some((t) => t.typ === z.variante)]).toEqual([z.variante, false]);
  });

  test.each(VAR_CSV.map((z) => [z.variante, z] as const))('%s: am Zieltyp wählbar, Zielgruppen der Variante, Bild des Zieltyps', (n, z) => {
    const t = typ(z.zieltyp);
    expect(t).toBeDefined();
    expect(t.bildOffen).toBeUndefined();
    const v = t.varianten.find((x) => x.name === n)!;
    expect(v).toBeDefined();
    expect([...v.zielgruppen].sort()).toEqual(zg(z.zielgruppen_variante));
    // Entwickeln mit Variante: Vorschau ok, Produkt trägt die Variante, Name aus der Variante, Bild des Zieltyps
    const s = neuesSpiel(3);
    const e = { typ: z.zieltyp, variante: n, farbe: 'marine' as const, material: t.materialien[0], dauer: 8, budgetWoche: 20_000, zielgruppe: v.zielgruppen[0] as 'teens' };
    const marke = markeFuer(s, e);
    const vs = produktVorschau(s, { ...e, marke });
    expect([n, vs.ok, vs.fehler]).toEqual([n, true, undefined]);
    expect(vs.name).toBe(`${n} marine`);
    const r = produktAktion(s, { typ: 'produktEntwickeln', entwurf: { ...e, marke } });
    expect([n, r.ok, r.text]).toEqual([n, true, r.text]);
    const p = s.produkte.liste[s.produkte.liste.length - 1];
    expect(p.typ).toBe(z.zieltyp);
    expect(p.variante).toBe(n);
    const karte = produkte(s, marke).marken.find((m) => m.marke === marke)!.produkte.find((x) => x.id === p.id)!;
    expect(karte.variante).toBe(n);
    expect(karte.bild).toEqual(t.bild);
  });

  test('unbekannte Variante wird abgelehnt, ohne Variante bleibt die Grundform', () => {
    const s = neuesSpiel(1);
    const e = { marke: 'em1', typ: 'Bluse', farbe: 'marine' as const, material: 'Viskose' as const, dauer: 8, budgetWoche: 20_000 };
    expect(produktVorschau(s, { ...e, variante: 'Keilstiefel' }).fehler).toMatch(/Bluse gibt es nicht als Keilstiefel/);
    expect(produktVorschau(s, { ...e, typ: 'Hemd', material: 'Baumwolle', variante: 'Blazerbluse' }).fehler).toMatch(/gibt es nicht als Blazerbluse/);
    expect(produktVorschau(s, { ...e }).name).toBe('Bluse marine');
    expect(typ('Hemd').varianten).toEqual([]);
  });

  test('Zielgruppe der Variante gilt nur für die Variante (Haarspangen im Set bleibt Kinderartikel)', () => {
    const t = typ('Haarspangen im Set');
    expect(t.zielgruppen).toEqual(['kinder']);
    expect(t.varianten.map((v) => v.name)).toEqual(['Haarnadeln', 'Haarspange']);
    const s = neuesSpiel(1);
    const m = s.eigenmarken.marken.find((x) => x.id === 'em1')!;
    const basis = { typ: 'Haarspangen im Set', farbe: 'marine' as const, material: 'Polyester' as const, preislage: 'mitte' as const, qualitaet: 3, dauer: 8, budgetWoche: 20_000, zielgruppe: 'young' as const };
    const mitVariante = bewerte(s, m, { ...basis, variante: 'Haarspange' }, 0.5, undefined).zielgruppe;
    const ohne = bewerte(s, m, basis, 0.5, undefined).zielgruppe;
    expect(mitVariante).toBeGreaterThan(ohne);
    // Die Damenmarke kann den Kinderartikel nur als Variante entwickeln (WG der Variante)
    expect(produktVorschau(s, { ...basis, marke: 'em1' }).ok).toBe(false);
    expect(produktVorschau(s, { ...basis, marke: 'em1', variante: 'Haarspange' }).ok).toBe(true);
    expect(produkte(s).marken.find((x) => x.marke === 'em1')!.entwickelbar).toContain('Haarspangen im Set');
  });

  test('Spielstand ohne Variante unverändert (Grundsortiment trägt kein Feld variante)', () => {
    const s = neuesSpiel(1);
    for (let i = 0; i < 4; i++) wocheAbspielen(s);
    expect(s.produkte.liste.filter((p) => 'variante' in p)).toEqual([]);
    const s2 = JSON.parse(JSON.stringify(s)) as GameState;
    wocheAbspielen(s2);
    expect(s2.produkte.liste.filter((p) => 'variante' in p)).toEqual([]);
  });
});

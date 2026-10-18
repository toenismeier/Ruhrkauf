import { fuehreAus, neuesSpiel, produkte, produktKatalog, produktVorschau, trendbericht, wocheAbspielen, produktNachfrageFaktor, produktMargeDelta } from '../src';
import type { GameState, ProduktEntwurf } from '../src';
import { bewerte, TYP, trendFuer } from '../src/produkte';
import { saisonId } from '../src/einkauf';

const spiele = (s: GameState, n: number) => { for (let i = 0; i < n; i++) { fuehreAus(s, { typ: 'sammelfreigabe' }); wocheAbspielen(s); } };
const GEDANKENSTRICH = /[–—]/;
const TYPEN = 'Jeans-Shorts, Kaschmirpullover, Strickjacke, Bluse, Hemd, T-Shirt, Poloshirt, Kleid, Rock, Chino, Jeans, Mantel, Steppjacke, Blazer, Sneaker, Pumps, Stiefel, Pyjama, Unterwäsche, BH, Socken, Schal, Mütze, Handtasche, Gürtel, Bettwäsche, Handtuch, Kissen, Tasse, Vase, Lippenstift, Creme, Parfum, Kinderbody, Kinderkleid, Plüschtier'.split(', ');
const FARBEN = 'weiß, creme, sand, beige, camel, cognac, braun, grau, anthrazit, schwarz, marine, hellblau, jeansblau, petrol, mintgrün, salbei, olive, flaschengrün, senf, gelb, orange, koralle, rot, bordeaux, rosa, altrosa, flieder, lila'.split(', ');

describe('Produktentwicklung', () => {
  test('Katalog genau wie mit der Grafik abgestimmt', () => {
    const k = produktKatalog(neuesSpiel(1));
    expect(k.typen.map((t) => t.typ)).toEqual(TYPEN);
    expect(k.farben.map((f) => f.name)).toEqual(FARBEN);
    expect(k.materialien.map((m) => m.name).sort()).toEqual(['Baumwolle', 'Bio-Baumwolle', 'Denim', 'Kaschmir', 'Leder', 'Leinen', 'Merino', 'Polyester', 'Seide', 'Viskose']);
    expect(k.dauer).toEqual([4, 8, 12, 24, 48]);
  });

  test('Start: alle vier Marken mit Sortiment, Lisanne altbackener als die anderen, Wirkung neutral', () => {
    const s = neuesSpiel(1);
    const p = produkte(s);
    expect(p.marken.length).toBe(4);
    const schnitt = (id: string) => { const m = p.marken.find((x) => x.marke === id)!; return m.produkte.reduce((a, x) => a + x.sterne, 0) / m.produkte.length; };
    for (const m of p.marken) expect(m.produkte.length).toBeGreaterThanOrEqual(5);
    expect(schnitt('em1')).toBeLessThan(Math.min(schnitt('em2'), schnitt('em3'), schnitt('em4')));
    for (const x of s.produkte.liste) {
      expect(produktNachfrageFaktor(s, x.marke, x.wg)).toBe(1);
      expect(produktMargeDelta(s, x.marke, x.wg)).toBe(0);
    }
    expect(GEDANKENSTRICH.test(JSON.stringify(p) + JSON.stringify(trendbericht(s)))).toBe(false);
  });

  test('Vorschau: Trend und Zielgruppe getroffen schlägt am Ziel vorbei, mehr Budget und Zeit bringen Sterne', () => {
    const s = neuesSpiel(1);
    // Lisannes Oberteile sind zum Start voll: erst eine alte Bluse auslisten
    expect(produktVorschau(s, { marke: 'em1', typ: 'Bluse', farbe: 'marine', material: 'Seide', dauer: 12, budgetWoche: 20_000 }).fehler).toMatch(/Kapazität/);
    fuehreAus(s, { typ: 'produktAuslisten', produkt: s.produkte.liste.find((x) => x.marke === 'em1' && x.typ === 'Bluse')!.id });
    // Trend der Einführungssaison (12 Wochen Entwicklung) für 50 plus
    const t = trendFuer(s, saisonId(s.woche + 12)).gruppen.reif;
    const typ = t.artikel.find((x) => produktVorschau(s, { marke: 'em1', typ: x, farbe: t.farben[0], material: TYP[x].materialien[0], dauer: 12, budgetWoche: 30_000 }).ok)!;
    expect(typ).toBeDefined();
    const material = TYP[typ].materialien.find((m) => t.materialien.includes(m)) ?? TYP[typ].materialien[0];
    const gut: ProduktEntwurf = { marke: 'em1', typ, farbe: t.farben[0], material, dauer: 12, budgetWoche: 30_000 };
    const schlecht: ProduktEntwurf = { marke: 'em1', typ: 'Jeans-Shorts', farbe: t.out[0], material: 'Denim', dauer: 12, budgetWoche: 30_000 };
    const vg = produktVorschau(s, gut); const vs = produktVorschau(s, schlecht);
    expect(vg.ok).toBe(true);
    expect(vs.ok).toBe(true);
    expect(vg.sterneErwartet).toBeGreaterThan(vs.sterneErwartet + 1);
    // Gleiche Saison, kleines Budget: deutlich schwächer
    expect(produktVorschau(s, { ...gut, budgetWoche: 3_000 }).sterneErwartet).toBeLessThanOrEqual(vg.sterneErwartet - 0.5);
    // Gleiches Gesamtbudget in 4 statt 12 Wochen: weniger effizient (Teilbewertung Entwicklung, Trend herausgerechnet)
    const m = s.eigenmarken.marken[0];
    const lang = bewerte(s, m, { ...gut, preislage: m.preislage, qualitaet: m.qualitaet }, 0.5, undefined);
    const kurz = bewerte(s, m, { ...gut, preislage: m.preislage, qualitaet: m.qualitaet, dauer: 4, budgetWoche: 30_000 * 3 }, 0.5, undefined);
    expect(kurz.entwicklung).toBeLessThan(lang.entwicklung);
    expect(produktVorschau(s, { ...gut, typ: 'Lippenstift' }).ok).toBe(false); // Lisanne führt keine Beauty
    expect(produktVorschau(s, { ...gut, material: 'Denim' }).ok).toBe(false);
  });

  test('Entwickeln, Einführen, Kapazität, Preis und Auslisten', () => {
    const s = neuesSpiel(2);
    const z0 = s.zentrale.kostenWoche;
    const r = fuehreAus(s, { typ: 'produktEntwickeln', entwurf: { marke: 'em4', typ: 'Jeans-Shorts', farbe: 'jeansblau', material: 'Denim', dauer: 8, budgetWoche: 20_000 } });
    expect(r.ok).toBe(true);
    expect(s.zentrale.kostenWoche - z0).toBe(20_000);
    const p = s.produkte.liste[s.produkte.liste.length - 1];
    expect(p.status).toBe('entwicklung');
    spiele(s, 9);
    expect(p.status).toBe('sortiment');
    expect(p.sterne).toBeGreaterThan(0);
    expect(p.verkauf[p.verkauf.length - 1]).toBeGreaterThan(0);
    // Kapazität: Unterteile von Pünktchen auffüllen, bis es nicht mehr geht
    let fehler = '';
    for (let i = 0; i < 8 && !fehler; i++) {
      const e = fuehreAus(s, { typ: 'produktEntwickeln', entwurf: { marke: 'em4', typ: 'Jeans', farbe: 'schwarz', material: 'Denim', dauer: 4, budgetWoche: 5_000 } });
      if (!e.ok) fehler = e.text;
    }
    expect(fehler).toMatch(/Kapazität/);
    // Preis hoch: Marge rauf, Nachfrage runter
    const f0 = produktNachfrageFaktor(s, p.marke, p.wg); const m0 = produktMargeDelta(s, p.marke, p.wg);
    fuehreAus(s, { typ: 'produktPreis', produkt: p.id, preis: p.preis * 1.3 });
    expect(produktNachfrageFaktor(s, p.marke, p.wg)).toBeLessThan(f0);
    expect(produktMargeDelta(s, p.marke, p.wg)).toBeGreaterThan(m0);
    expect(fuehreAus(s, { typ: 'produktAuslisten', produkt: p.id }).ok).toBe(true);
    expect(p.status).toBe('ausgelistet');
  });

  test('Gute Produkte heben den Markenumsatz gegenüber dem Startsortiment', () => {
    const a = neuesSpiel(1);
    spiele(a, 2);
    const b = structuredClone(a);
    const t = trendbericht(b);
    // Lisanne: schwächste Produkte gegen trendgerechte tauschen
    const lis = b.produkte.liste.filter((x) => x.marke === 'em1' && x.wg === 'damen.blusen');
    for (const x of lis) fuehreAus(b, { typ: 'produktAuslisten', produkt: x.id });
    const farbe = t.aktuell.gruppen.reif.farben[0];
    for (const typ of ['Bluse', 'Bluse'] as const) fuehreAus(b, { typ: 'produktEntwickeln', entwurf: { marke: 'em1', typ, farbe, material: 'Seide', dauer: 4, budgetWoche: 60_000, wg: 'damen.blusen' } });
    spiele(a, 12); spiele(b, 12);
    const u = (s: GameState) => s.einkauf.markenKpi.em1.u.slice(-6).reduce((x, y) => x + y, 0);
    expect(u(b)).toBeGreaterThan(u(a));
  });
});

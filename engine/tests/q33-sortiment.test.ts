// Q33: Sortiment je Zielgruppe für Kinder, Teens & Tweens, Young Adults (Befunde Wurf 3 Nr. 8 und 9).
import { readFileSync } from 'fs';
import { join } from 'path';
import { neuesSpiel, produktKatalog, produkte } from '../src';
import { ARTIKELTYPEN, SORTIMENT_TYPEN } from '../src/produkte';
import { NAMEN as Q33_NAMEN } from '../src/sortiment/q33-jung';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, { nur?: string }>;
const s = neuesSpiel(1);
const K = produktKatalog(s);
const fuer = (z: string) => K.typen.filter((t) => t.zielgruppen.includes(z as never));

describe('Q33 Sortiment jung', () => {
  test('je Zielgruppe Kinder, Teens & Tweens, Young Adults mindestens 180 Artikeltypen', () => {
    for (const z of ['kinder', 'teens', 'young']) expect(fuer(z).length).toBeGreaterThanOrEqual(180);
  });
  test('zielgruppengerecht: kein Business-Schuh, keine Bundfalten- oder Komforthose bei Teens; Crop-Tops bei Teens, nicht bei Best Agern', () => {
    const teens = new Set(fuer('teens').map((t) => t.typ));
    // Q37: Anlassmode auch für Teens (E45: Anzug, Krawatte für Abiball und Konfirmation), deshalb nicht mehr in dieser Liste
    for (const typ of ['Business-Schuh', 'Komforthose', 'Twinset', 'Budapester', 'Kochtopf', 'Bratpfanne', 'Weinglas', 'Kinderbody']) expect(teens.has(typ)).toBe(false);
    for (const typ of ['Crop-Top', 'Hoodie', 'Crop-Hoodie', 'Bucket Hat', 'Schulrucksack', 'Chunky-Sneaker', 'Baggy-Jeans']) expect(teens.has(typ)).toBe(true);
    expect(fuer('bestager').some((t) => t.typ === 'Crop-Top')).toBe(false);
  });
  test('Kinder sehen nur Kindgerechtes, Erwachsene keine Kinderartikel', () => {
    const kinder = new Set(fuer('kinder').map((t) => t.typ));
    for (const typ of ['Schulranzen', 'Wickelbody', 'Kinder-Jeans', 'Spielball', 'Spielteppich']) expect(kinder.has(typ)).toBe(true);
    for (const typ of ['Bikini', 'Pumps', 'Kochtopf', 'Weinglas', 'Crop-Top']) expect(kinder.has(typ)).toBe(false);
    // Q37: Stoppersocken und Bommelmütze sind für Adults freigeschaltet (Referenzsortiment)
    const frei = new Set(['Stoppersocken', 'Bommelmütze']);
    for (const z of ['adults', 'bestager']) expect(fuer(z).some((t) => !frei.has(t.typ) && (t.kategorie === 'kinder' || /^Kinder/.test(t.typ) || Q33_NAMEN.includes(t.typ) && t.gruppe.mitte === 0))).toBe(false);
  });
  test('Teens und Young Adults sind getrennt (Schulartikel nur Teens, Business nur Young)', () => {
    const teens = new Set(fuer('teens').map((t) => t.typ)), young = new Set(fuer('young').map((t) => t.typ));
    expect(teens.has('Schulrucksack')).toBe(true); expect(young.has('Schulrucksack')).toBe(false);
    // Q37: Blazer ist für Teens freigeschaltet; Business-Schuh bleibt Young Adults und älter
    expect(young.has('Blazer')).toBe(true); expect(teens.has('Blazer')).toBe(true); expect(teens.has('Business-Schuh')).toBe(false);
  });
  test('Kinder- und Jugendmarke Pünktchen kann je passender Zielgruppe mindestens 80 Typen entwickeln', () => {
    const m = produkte(s).marken.find((x) => x.name === 'Pünktchen')!;
    const kats = new Set(m.kategorien.map((k) => k.id));
    for (const z of ['kinder', 'teens']) expect(fuer(z).filter((t) => m.entwickelbar.includes(t.typ) && kats.has(t.kategorie)).length).toBeGreaterThanOrEqual(80);
  });
  test('kein doppelter Ast „Kinder und Baby“: Kinderbekleidung nach Art, Baby und Spielzeug eigene Unterkategorien', () => {
    const kind = K.baum.find((a) => a.id === 'kinder')!;
    expect(kind.name).toBe('Baby und Spielzeug');
    expect(kind.unterkategorien.map((u) => u.name).sort()).toEqual(['Baby', 'Spielzeug']);
    const ober = K.baum.find((a) => a.id === 'oberteile')!.unterkategorien.flatMap((u) => u.typen);
    expect(ober).toEqual(expect.arrayContaining(['Kinder-T-Shirt', 'Kinder-Dino-Shirt']));
  });
  test('neue Typen: Bild aus der Bibliothek, Kinderbilder nur für Kinder, hinten angehängt', () => {
    const neu = SORTIMENT_TYPEN.filter((t) => Q33_NAMEN.includes(t.typ));
    expect(neu.length).toBe(Q33_NAMEN.length);
    for (const t of neu) {
      expect(SILH[t.bild.silhouette]).toBeDefined();
      if (t.bild.silhouette.startsWith('k_')) expect(t.gruppe.jung + t.gruppe.mitte + t.gruppe.reif).toBe(0);
    }
    expect(ARTIKELTYPEN.slice(-SORTIMENT_TYPEN.length).map((t) => t.typ)).toEqual(SORTIMENT_TYPEN.map((t) => t.typ));
  });
  test('bestehende Kindertypen haben eigenes Kinderbild', () => {
    const bild = (typ: string) => K.typen.find((t) => t.typ === typ)?.bild?.silhouette;
    for (const typ of ['Kinder-T-Shirt', 'Kinder-Hoodie', 'Kinderbettwäsche', 'Kinder-Sommerkleid']) expect(bild(typ)).toMatch(/^k_/);
    // Q34 hat einige Kindertypen selbst neu gezeichnet; dann gilt dessen Bild, nie das Erwachsenenbild
    for (const [kind, gross] of [['Kinder-Jeans', 'Jeans'], ['Kinder-Sweatshirt', 'Sweatshirt'], ['Kinder-Pyjama', 'Pyjama']]) expect(bild(kind)).not.toBe(bild(gross) ?? 'x');
  });
});

// Q27–Q29: gemeinsamer Haken engine/src/sortiment – neue Artikeltypen mit Bild aus der Silhouetten-Bibliothek.
import { readFileSync } from 'fs';
import { join } from 'path';
import { ARTIKELTYPEN, SORTIMENT_TYPEN } from '../src/produkte';
import { neuesSpiel, produktKatalog } from '../src';

const SILH = JSON.parse(readFileSync(join(__dirname, '../../render/src/kit/mode/silhouetten.json'), 'utf8')).silhouetten as Record<string, { model: string | null; nur?: string }>;

describe('Sortiment-Haken (Q27–Q29)', () => {
  test('Artikeltypnamen sind eindeutig', () => {
    const namen = ARTIKELTYPEN.map((t) => t.typ);
    expect(namen.length).toBe(new Set(namen).size);
  });
  test('neue Typen hängen hinten an und haben ein gültiges Bild', () => {
    expect(ARTIKELTYPEN.slice(ARTIKELTYPEN.length - SORTIMENT_TYPEN.length)).toEqual(SORTIMENT_TYPEN);
    for (const t of SORTIMENT_TYPEN) {
      expect(SILH[t.bild.silhouette]).toBeDefined();
      expect(t.wgs.length).toBeGreaterThan(0);
      expect(t.materialien.length).toBeGreaterThan(0);
      expect(t.preis).toBeGreaterThan(0);
    }
  });
  test('Kinderartikel nur für Kinder, Kinderbilder nur in Kinder-Typen', () => {
    for (const t of SORTIMENT_TYPEN) {
      const kind = SILH[t.bild.silhouette].nur === 'kinder';
      if (kind) expect(t.gruppe.jung + t.gruppe.mitte + t.gruppe.reif).toBe(0);
      if (t.gruppe.kinder === 0) expect(kind).toBe(false);
    }
  });
  test('Katalog reicht das Bild durch', () => {
    const K = produktKatalog(neuesSpiel(1));
    for (const t of SORTIMENT_TYPEN) expect(K.typen.find((x) => x.typ === t.typ)?.bild).toEqual(t.bild);
  });
});

describe('Q27 Mode-Artikeltypen', () => {
  const Q27 = SORTIMENT_TYPEN.filter((t) => ['oberteile', 'unterteile', 'jacken', 'kinder'].includes(t.kategorie) || /Bade|Bikini/.test(t.typ));
  test('mindestens 100 neue Mode-Typen', () => expect(Q27.length).toBeGreaterThanOrEqual(100));
  test('zielgruppengerecht: nichts Junges für Best Ager, nichts Gesetztes für Teens', () => {
    for (const t of Q27) {
      if (/Baggy|Cargo|Crop|Corsage|Minikleid|Mini|Trainings|Oversize|Babytee|Boxy|Varsity|Tanktop/.test(t.typ)) expect(t.gruppe.reif).toBeLessThanOrEqual(0.2);
      if (/Twinset|Komfort|Poncho|Schluppen|Kaftan/.test(t.typ)) expect(t.gruppe.jung).toBeLessThanOrEqual(0.4);
    }
  });
  test('jede Zielgruppe hat eigene Auswahl', () => {
    for (const g of ['kinder', 'jung', 'mitte', 'reif'] as const) expect(Q27.filter((t) => t.gruppe[g] >= 0.5).length).toBeGreaterThanOrEqual(20);
  });
});

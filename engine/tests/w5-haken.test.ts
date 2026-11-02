// Wurf 5, Haken (auftraege/wurf5/README.md): Schnittvariante mit eigenem Bild und bildOffen.
// Testvarianten an der Bluse über einen Ersatz für w5-oberteile.ts: „Haken-Bild“ mit eigener Silhouette, „Haken-Offen“ mit bildOffen.
// Geprüft: Katalog zeigt nur wählbare Varianten mit Bild, Vorschau und Entwicklung lehnen bildOffen ab,
// das entwickelte Produkt trägt das Variantenbild, ohne Variante das Bild des Typs.
jest.mock('../src/sortiment/w5-oberteile', () => ({
  VARIANTEN_W5_OBERTEILE: [
    { name: 'Haken-Bild', zieltyp: 'Bluse', zielgruppen: ['teens', 'young', 'adults'], bild: { silhouette: 'croptop' } },
    { name: 'Haken-Offen', zieltyp: 'Bluse', zielgruppen: ['teens', 'young', 'adults'], bild: { silhouette: 'croptop' }, bildOffen: true },
  ],
  NAMEN: [],
  TYPEN: [],
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { fuehreAus, neuesSpiel, produktKatalog, produkte } from '../src';
import { produktVorschau, type ProduktEntwurf } from '../src/produkte';
import { VARIANTEN, alleVariantenFuer, variantenFuer } from '../src/sortiment/q42-varianten';

const s = neuesSpiel(1);
const bluse = () => produktKatalog(s).typen.find((t) => t.typ === 'Bluse')!;

/** Platz schaffen und eine Marke finden, die Blusen für Teens entwickelt. */
function entwurf(variante?: string): ProduktEntwurf {
  const alt = s.produkte.liste.find((q) => q.typ === 'Bluse' && q.status === 'sortiment');
  if (alt) fuehreAus(s, { typ: 'produktAuslisten', produkt: alt.id });
  const e = { typ: 'Bluse', zielgruppe: 'teens', farbe: 'marine', material: 'Viskose', preislage: 'mitte', qualitaet: 3, dauer: 8, budgetWoche: 2000, ...(variante ? { variante } : {}) } as Omit<ProduktEntwurf, 'marke'>;
  const m = s.eigenmarken.marken.find((x) => produktVorschau(s, { ...e, marke: x.id }).ok || produktVorschau(s, { ...e, variante: undefined, marke: x.id }).ok);
  if (!m) throw new Error('keine Marke für Blusen');
  return { ...e, marke: m.id } as ProduktEntwurf;
}

describe('Wurf 5 Haken: Schnittvariante mit eigenem Bild', () => {
  test('Varianten der fünf Wurf-5-Dateien hängen an VARIANTEN, bildOffen bleibt intern', () => {
    expect(VARIANTEN.map((v) => v.name)).toEqual(expect.arrayContaining(['Haken-Bild', 'Haken-Offen']));
    expect(alleVariantenFuer('Bluse').map((v) => v.name)).toContain('Haken-Offen');
    expect(variantenFuer('Bluse').map((v) => v.name)).not.toContain('Haken-Offen');
  });

  test('Katalog: Variante mit Bild trägt es, bildOffen fehlt, Q42-Varianten ohne eigenes Bild', () => {
    const v = bluse().varianten;
    expect(v.find((x) => x.name === 'Haken-Bild')?.bild).toEqual({ silhouette: 'croptop' });
    expect(v.some((x) => x.name === 'Haken-Offen')).toBe(false);
    expect(v.find((x) => x.name === 'Cape-Bluse')?.bild).toBeUndefined();
  });

  test('bildOffen ist weder in der Vorschau noch in der Entwicklung wählbar', () => {
    const e = entwurf('Haken-Offen');
    const v = produktVorschau(s, e);
    expect(v.ok).toBe(false);
    expect(v.fehler).toMatch(/noch nicht freigegeben/);
    const n = s.produkte.liste.length;
    expect(fuehreAus(s, { typ: 'produktEntwickeln', entwurf: e }).ok).toBe(false);
    expect(s.produkte.liste.length).toBe(n);
  });

  test('Produkt mit Variante zeigt das Variantenbild, ohne Variante das Bild des Typs', () => {
    const mit = entwurf('Haken-Bild');
    expect(produktVorschau(s, mit).ok).toBe(true);
    expect(fuehreAus(s, { typ: 'produktEntwickeln', entwurf: mit }).ok).toBe(true);
    const pMit = s.produkte.liste[s.produkte.liste.length - 1];
    const ohne = entwurf();
    expect(fuehreAus(s, { typ: 'produktEntwickeln', entwurf: ohne }).ok).toBe(true);
    const pOhne = s.produkte.liste[s.produkte.liste.length - 1];
    const alle = produkte(s).marken.flatMap((m) => m.produkte);
    expect(alle.find((p) => p.id === pMit.id)?.bild).toEqual({ silhouette: 'croptop' });
    expect(alle.find((p) => p.id === pOhne.id)?.bild).toEqual(bluse().bild);
  });
});

describe('Wurf 5: Pakete aus daten/v-pakete.csv', () => {
  // Greift, sobald Phase 0 die Paketliste auf main legt: jede Zeile als Variante (mit Bild oder bildOffen) oder als neuer Typ vorhanden.
  const pfad = join(__dirname, '../../auftraege/wurf5/daten/v-pakete.csv');
  let zeilen: Record<string, string>[] = [];
  try {
    const t = readFileSync(pfad, 'utf8').replace(/^﻿/, '').trim().split('\n').map((l) => l.split(';'));
    zeilen = t.slice(1).map((z) => Object.fromEntries(t[0].map((k, i) => [k.trim(), (z[i] ?? '').trim()])));
  } catch { /* Paketliste noch nicht auf main */ }
  const fertig = new Set<string>();
  test('Paketliste lesbar oder noch nicht vorhanden', () => { expect(Array.isArray(zeilen)).toBe(true); });
  // Nur Pakete, deren Chat schon eingetragen hat (mindestens eine Variante des Pakets vorhanden), werden geprüft
  for (const z of zeilen) if (VARIANTEN.some((v) => v.name === z.variante && v.zieltyp === z.zieltyp)) fertig.add(z.paket);
  const zuPruefen = zeilen.filter((z) => fertig.has(z.paket) && z.spielstatus !== 'neu');
  if (zuPruefen.length) test.each(zuPruefen.map((z) => [`${z.paket} ${z.variante}`, z] as const))('%s: Variante vorhanden, Bild oder bildOffen', (_n, z) => {
    const v = VARIANTEN.find((x) => x.name === z.variante && x.zieltyp === z.zieltyp);
    expect(v).toBeDefined();
    expect(!!v!.bild || !!v!.bildOffen).toBe(true);
  });
});

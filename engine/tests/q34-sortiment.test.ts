// Q34: Sortiment Adults und Best Ager. Zählt je Zielgruppe, prüft Zielgruppengerechtigkeit und
// stellt mit den echten Bildern der Grafik sicher, dass kein Artikeltyp ein Bild doppelt hat und jede Schuhart einen eigenen Leisten zeigt.
import { join } from 'node:path';
import Module from 'node:module';
import { buildSync } from 'esbuild';
import { neuesSpiel, produktKatalog } from '../src';
import { ARTIKELTYPEN } from '../src/produkte';
import { NAMEN as Q34_NAMEN, TYPEN as Q34_TYPEN } from '../src/sortiment/q34-erwachsen';
import { KORREKTUREN } from '../src/sortiment/q34-zielgruppen';

// Bildfunktionen und Filter der Oberfläche aus render/ (wie im Spiel), einmal gebündelt
type Grafik = {
  typKachelSVG: (typ: string, g: number, opt: object) => string;
  passendeTypen: (K: object, fach: string, gruppe: string) => { typ: string }[];
  SILHOUETTEN: Record<string, { gruppe: string }>;
};
function grafik(): Grafik {
  const render = join(__dirname, '../../render');
  const out = buildSync({
    stdin: { contents: "export { typKachelSVG } from './src/kit/produktbild.js';\nexport { passendeTypen } from './src/ui/produkte-q24.js';\nexport { SILHOUETTEN } from './src/kit/mode/silhouetten.js';", resolveDir: render, loader: 'js' },
    bundle: true, format: 'cjs', platform: 'node', write: false, logLevel: 'error',
  });
  const m = new Module(join(render, 'q34-test.js'));
  (m as unknown as { _compile: (code: string, file: string) => void })._compile(out.outputFiles[0].text, join(render, 'q34-test.js'));
  return m.exports as Grafik;
}
const G = grafik();
const K = produktKatalog(neuesSpiel(1));
// gleiche Bilder erkennen: IDs der Verläufe und Muster sind je Aufruf zufällig, daher fortlaufend umbenennen
const norm = (svg: string) => {
  const ids = new Map<string, string>();
  return svg.replace(/id="([^"]+)"/g, (_, i: string) => { if (!ids.has(i)) ids.set(i, 'i' + ids.size); return `id="${ids.get(i)}"`; })
    .replace(/#([A-Za-z][\w-]*)\)/g, (m, i: string) => (ids.has(i) ? `#${ids.get(i)})` : m));
};
const bild = (t: { typ: string; bild?: object }) => norm(G.typKachelSVG(t.typ, 64, t.bild ? { bild: t.bild } : {}));
const sichtbar = (zielgruppe: string) => {
  const m = new Map<string, { typ: string }>();
  for (const fach of ['damen', 'herren', 'home']) for (const t of G.passendeTypen(K, fach, zielgruppe)) m.set(t.typ, t);
  return [...m.values()];
};

describe('Q34: Sortiment Adults und Best Ager', () => {
  test('je Zielgruppe mindestens 180 Artikeltypen mit eigenem Bild (Damen, Herren, Home)', () => {
    for (const z of ['adults', 'bestager']) {
      const typen = sichtbar(z);
      const bilder = new Set(typen.map((t) => bild(K.typen.find((x) => x.typ === t.typ)!)));
      expect(typen.length).toBeGreaterThanOrEqual(180);
      expect(bilder.size).toBe(typen.length);
    }
  });

  test('kein Bild doppelt über alle Artikeltypen', () => {
    const je = new Map<string, string[]>();
    // Wurf 4: Typen mit offenem Bild (bildOffen) zeigen bis zur Abnahme eine vorhandene Silhouette
    for (const t of K.typen.filter((x) => !x.bildOffen)) { const b = bild(t); je.set(b, [...(je.get(b) ?? []), t.typ]); }
    const doppelt = [...je.values()].filter((l) => l.length > 1).map((l) => l.join(' = '));
    expect(doppelt).toEqual([]);
  });

  test('jede Schuhart hat einen eigenen Leisten (Form gleich auch ohne Farbe verschieden)', () => {
    const form = (svg: string) => svg.replace(/#[0-9a-fA-F]{3,8}\b/g, '#c');
    const schuhe = K.typen.filter((t) => t.kategorie === 'schuhe');
    const je = new Map<string, string[]>();
    for (const t of schuhe) { const b = form(bild(t)); je.set(b, [...(je.get(b) ?? []), t.typ]); }
    expect([...je.values()].filter((l) => l.length > 1)).toEqual([]);
    // Befund Wurf 3 Bild 04: diese fünf zeigten das Loafer-Bild, der Wanderschuh einen Stiefel
    const sil = (typ: string) => K.typen.find((t) => t.typ === typ)!.bild?.silhouette;
    expect(new Set(['Loafer', 'Ballerina', 'Business-Schuh', 'Schnürschuh', 'Slipper'].map(sil)).size).toBe(5);
    expect(sil('Wanderschuh')).toBe('wanderschuh');
    for (const t of schuhe) expect(G.SILHOUETTEN[t.bild?.silhouette ?? '']?.gruppe ?? 'schuhe').toBe('schuhe');
  });

  test('neue Typen: eindeutig, mit Bild aus der Bibliothek, Platz im Baum, zielgruppengerecht', () => {
    const alle = ARTIKELTYPEN.map((t) => t.typ);
    expect(new Set(alle).size).toBe(alle.length);
    expect(new Set(Q34_TYPEN.map((t) => t.typ))).toEqual(new Set(Q34_NAMEN));
    expect(Q34_TYPEN).toHaveLength(Q34_NAMEN.length);
    for (const t of Q34_TYPEN) {
      expect(G.SILHOUETTEN[t.bild.silhouette]).toBeDefined();
      expect(t.pfad).toBeDefined();
      expect(t.gruppe.kinder).toBe(0);
      expect(Math.max(t.gruppe.mitte, t.gruppe.reif)).toBeGreaterThanOrEqual(0.9);
      expect(t.gruppe.jung).toBeLessThanOrEqual(0.45);
    }
    // keine Crop-Tops, Baggy-, Cargo- oder Skinny-Teile für Best Ager; kein Crop-Top für Adults
    const best = new Set(sichtbar('bestager').map((t) => t.typ));
    for (const typ of ['Crop-Top', 'Crop-Hoodie', 'Baggy-Jeans', 'Cargo-Hose', 'Cargo-Shorts', 'Skinny-Jeans', 'Babytee', 'Corsage', 'Plateau-Sneaker']) expect(best.has(typ)).toBe(false);
    expect(sichtbar('adults').some((t) => t.typ === 'Crop-Top')).toBe(false);
    for (const typ of ['Twinset', 'Bundfaltenhose', 'Steppweste', 'Komfortschuh', 'Lesebrillenetui', 'Gehstock-Schirm', 'Schlupfhose', 'Einkaufstrolley']) expect(best.has(typ)).toBe(true);
  });

  test('Korrekturen treffen bestehende Typen und verweisen auf vorhandene Silhouetten', () => {
    for (const [typ, k] of Object.entries(KORREKTUREN)) {
      const t = ARTIKELTYPEN.find((x) => x.typ === typ);
      expect(t).toBeDefined();
      if (k.bild) { expect(G.SILHOUETTEN[k.bild.silhouette]).toBeDefined(); expect(t!.bild).toEqual(k.bild); }
      if (k.gruppe) expect(t!.gruppe).toEqual(k.gruppe);
    }
  });
});

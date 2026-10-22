// Q11: Jeder Engine-Artikeltyp hat ein Produktbild aus der Silhouetten-Bibliothek (kit/mode, Q25).
// cd render && node tests/q11-bilder.cjs (nur statische SVGs, kein Browser).
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const out = path.join(__dirname, '..', 'out', 'q11-bilder-pruefung.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  stdin: {
    contents: `import { ARTIKELTYPEN } from '../../engine/src/produkte.ts';
import { produktbildSVG } from '../src/kit/produktbild.js';
import { bildFuer } from '../src/kit/mode/produkt.js';
import { SILHOUETTEN } from '../src/kit/mode/silhouetten.js';
export { ARTIKELTYPEN, produktbildSVG, bildFuer, SILHOUETTEN };`,
    resolveDir: __dirname,
    sourcefile: 'q11-katalog-einstieg.js',
    loader: 'js',
  },
  platform: 'node', format: 'cjs', target: 'es2020', bundle: true, outfile: out, logLevel: 'error',
});
const { ARTIKELTYPEN, produktbildSVG, bildFuer, SILHOUETTEN } = require(out);
const engine = ARTIKELTYPEN.map((t) => t.typ);
assert.ok(engine.length >= 139, '36 Grundtypen + 96 Q05 + 7 Q11, dazu Q27–Q29 (engine/src/sortiment)');
assert.equal(new Set(engine).size, engine.length, 'Artikeltypen eindeutig');
// Sortimenttypen (Q27–Q29) bringen ihr Bild selbst mit (t.bild), die übrigen über den Namen.
const BILD = new Map(ARTIKELTYPEN.map((t) => [t.typ, t.bild]));
for (const typ of engine) {
  const b = BILD.get(typ) ?? bildFuer(typ);
  assert.ok(SILHOUETTEN[b.silhouette], typ + ' → unbekannte Silhouette ' + b.silhouette);
  assert.ok(b.silhouette !== 'tshirt' || typ === 'T-Shirt', typ + ': fällt auf T-Shirt zurück');
  const svg = produktbildSVG(typ, undefined, undefined, 120, BILD.get(typ) ? { bild: BILD.get(typ) } : {});
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /NaN|undefined/, typ);
}
// Die sieben Q11-Typen haben eigene Bilder statt der Vorlagen T-Shirt/Chino.
for (const [typ, sil] of [['Top', 'top'], ['Crop-Top', 'croptop'], ['Stoffhose', 'stoffhose'], ['Leinenhose', 'leinenhose'], ['Cargohose', 'cargohose'], ['Minirock', 'minirock']])
  assert.equal(bildFuer(typ).silhouette, sil, typ);
console.log('Q11:', engine.length, 'Artikeltypen, alle mit bekannter Silhouette, keiner im T-Shirt-Rückfall.');

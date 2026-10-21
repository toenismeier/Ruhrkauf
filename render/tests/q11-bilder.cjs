// Q11: Bilder-/Engine-Katalog gegen dieselbe Typ-Liste validieren.
// Claude: cd render && node tests/q11-bilder.cjs (nur statische SVGs, kein Browser).
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const out = path.join(__dirname, '..', 'out', 'q11-bilder-pruefung.cjs');
fs.mkdirSync(path.dirname(out), { recursive: true });
esbuild.buildSync({
  stdin: {
    contents: `import { ARTIKELTYPEN } from '../../engine/src/produkte.ts';
import { ARTIKELTYPEN_BILD, produktbildSVG, STANDARD_FARBE, STANDARD_MATERIAL } from '../src/kit/produktbild.js';
export { ARTIKELTYPEN, ARTIKELTYPEN_BILD, produktbildSVG, STANDARD_FARBE, STANDARD_MATERIAL };`,
    resolveDir: __dirname,
    sourcefile: 'q11-katalog-einstieg.js',
    loader: 'js',
  },
  platform: 'node', format: 'cjs', target: 'es2020', bundle: true, outfile: out, logLevel: 'error',
});
const { ARTIKELTYPEN, ARTIKELTYPEN_BILD, produktbildSVG, STANDARD_FARBE, STANDARD_MATERIAL } = require(out);
const engine = ARTIKELTYPEN.map((t) => t.typ);
assert.equal(engine.length, 139, '36 Grundtypen + 96 Q05 + 7 Q11');
assert.deepEqual(new Set(ARTIKELTYPEN_BILD), new Set(engine), 'Kein fehlendes Bild und kein Fremdtyp');
const formen = new Map();
for (const typ of engine) {
  const svg = produktbildSVG(typ, STANDARD_FARBE[typ], STANDARD_MATERIAL[typ], 120);
  assert.match(svg, /^<svg/);
  assert.doesNotMatch(svg, /NaN|undefined/);
  const form = svg.split('</defs>')[1]?.match(/<path d="([^"]+)"/)?.[1];
  assert.ok(form, typ + ': Keine Kontur');
  assert.ok(!formen.has(form), typ + ' teilt seine Hauptkontur mit ' + formen.get(form));
  formen.set(form, typ);
}
for (const [a,b] of [['Wickelkleid','T-Shirt'], ['Trenchcoat','Steppjacke'], ['Feinstrickpullover','Rundhalspullover'], ['Tunikabluse','Hemd'], ['Plisseerock','Bleistiftrock']]) {
  assert.notEqual(produktbildSVG(a, '#8899aa'), produktbildSVG(b, '#8899aa'), a + ' ≠ ' + b);
}
console.log('Q11:', engine.length, 'Produkte, alle SVG-Konturen eindeutig, kein Typ fehlt.');
